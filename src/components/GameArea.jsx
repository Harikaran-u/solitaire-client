import { useRef, useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import StartGame from "./StartGame";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

import GameSuccess from "./GameSuccess";

import "../styles/GameArea.css";

const GameArea = () => {
  const [pilesData, setPilesData] = useState([]);
  const [extraCards, setExtraCards] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [selectedCardsDetails, setSelectedCardsDetails] = useState(null);
  const [validSetCount, setValidSetCount] = useState(0);
  const [score, setScore] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const clientRef = useRef(null);

  useEffect(() => {
    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("Connected to web Socket");
        if (!clientRef.current) {
          clientRef.current = stompClient;
          stompClient.subscribe("/topic/cardList", handlePileCards);
          stompClient.subscribe("/topic/extraCards", handleExtraCards);
          stompClient.subscribe("/topic/updatedCards", handleUpdatedCards);
          stompClient.subscribe("/topic/score", handleGetScore);
        }
      },
      onStompError: (frame) => {
        console.error("Broker Error: " + frame.headers["message"]);
      },
      onWebSocketClose: (event) => {
        console.log("WebSocket connection lost.");
        console.log("Close event details:", event);
        if (event) {
          console.log("Code:", event.code);
          console.log("Reason:", event.reason);
          console.log("Was Clean:", event.wasClean);
        }
      },
      onReconnect: () => {
        console.log("WebSocket reconnected.");
      },
    });
    stompClient.activate();

    return () => {
      if (stompClient && stompClient.connected) {
        stompClient.deactivate();
      }
    };
  }, []);

  const handlePileCards = (message) => {
    const pilesData = JSON.parse(message.body);
    setPilesData(pilesData);
  };

  const handleExtraCards = (message) => {
    const extraCards = JSON.parse(message.body);
    setExtraCards(extraCards);
  };

  const handleUpdatedCards = (message) => {
    const updatedCards = JSON.parse(message.body);
    setPilesData(updatedCards);
    console.log("whole", updatedCards);
  };

  const handleGetScore = (message) => {
    setScore(parseInt(message.body));
  };

  const getPileCards = () => {
    if (clientRef.current) {
      clientRef.current.publish({ destination: "/app/cards/piles" });
    }
  };

  const getExtraCards = () => {
    if (clientRef.current) {
      clientRef.current.publish({ destination: "/app/cards/extra" });
    }
  };

  const getScore = () => {
    if (clientRef.current) {
      clientRef.current.publish({ destination: "/app/cards/score" });
    }
  };

  const updateScore = (type) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: "/app/cards/update-score",
        body: type,
      });
    }
  };

  const onClickStartGame = () => {
    setIsStarted(true);
    getPileCards();
    getExtraCards();
    getScore();
  };

  const onClickExtraCards = () => {
    const cardSet = extraCards.slice(0, 10);
    setExtraCards((prevExtraCards) => prevExtraCards.slice(10));
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: "/app/cards/updated",
        body: JSON.stringify(cardSet),
      });
    }
    updateScore("MOVE");
  };

  const handleDragStart = (e, pileNumber, cardPosition) => {
    const cardList = pilesData[pileNumber];
    const cardsFromPosition = cardList.slice(cardPosition);
    setSelectedCardsDetails({
      deckNumber: pileNumber,
      dropCardIndex: cardPosition,
      dropCardList: cardsFromPosition,
    });
    const isValidSwap = cardsFromPosition.every((eachCard, index) => {
      if (index === 0) {
        return true;
      }
      return (
        getRankNumber(cardsFromPosition[index - 1].rank) -
          getRankNumber(eachCard.rank) ===
        1
      );
    });

    if (isValidSwap) {
      const cardDetails = {
        deckNumber: pileNumber,
        dropCardIndex: cardPosition,
        dropCardList: cardsFromPosition,
        notDraggable: false,
      };
      e.dataTransfer.setData("drag-card", JSON.stringify(cardDetails));
    } else {
      e.dataTransfer.setData(
        "drag-card",
        JSON.stringify({
          notDraggable: true,
        })
      );
    }
  };

  const handleDragEnd = (e) => {
    e.dataTransfer.clearData();
  };

  const handleDrop = (e, pileNumber, cardPosition) => {
    e.preventDefault();
    const cardDetails = JSON.parse(e.dataTransfer.getData("drag-card"));
    const { notDraggable } = cardDetails;

    if (!notDraggable) {
      const { deckNumber, dropCardIndex, dropCardList } = cardDetails;
      const onTopCard = pilesData[pileNumber][cardPosition];
      const topCardRank = getRankNumber(onTopCard.rank);
      const dropCardRank = getRankNumber(dropCardList[0].rank);
      const rankDiff = topCardRank - dropCardRank;

      if (rankDiff == 1) {
        setPilesData((prevPiles) => {
          const newPilesData = { ...prevPiles };
          newPilesData[pileNumber].push(...dropCardList);

          if (dropCardIndex > 0) {
            newPilesData[deckNumber][dropCardIndex - 1].isFlipped = true;
          }

          newPilesData[deckNumber].splice(dropCardIndex);

          const lastDeck = newPilesData[pileNumber].slice(-13);

          if (lastDeck.length === 13) {
            const isValidSwap = lastDeck.every((eachCard, index) => {
              if (index === 0) {
                return true;
              }
              return (
                getRankNumber(lastDeck[index - 1].rank) -
                  getRankNumber(eachCard.rank) ===
                1
              );
            });
            if (isValidSwap) {
              const fromIndex = newPilesData[pileNumber].length - 13;
              newPilesData[pileNumber].splice(fromIndex);
              setValidSetCount((prev) => prev + 1);

              const lastCard = newPilesData[pileNumber].at(-1);
              if (lastCard !== undefined) {
                lastCard.isFlipped = true;
              }

              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 5000);
              updateScore("SUCCESS");
            } else {
              updateScore("MOVE");
            }
          } else {
            updateScore("MOVE");
          }

          return newPilesData;
        });
      }
    }
    // console.log(card);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getRankNumber = (rankStr) => {
    switch (rankStr) {
      case "A":
        return 1;

      case "K":
        return 13;

      case "Q":
        return 12;

      case "J":
        return 11;
      default:
        return parseInt(rankStr);
    }
  };

  const handleNewDrop = (e, pileNumber) => {
    e.preventDefault();
    const { deckNumber, dropCardIndex } = selectedCardsDetails;
    const { dropCardList } = JSON.parse(e.dataTransfer.getData("drag-card"));

    if (dropCardList) {
      setPilesData((prevPiles) => {
        const newPilesData = { ...prevPiles };
        newPilesData[pileNumber].push(...dropCardList);
        newPilesData[deckNumber].splice(dropCardIndex);
        const lastCard = newPilesData[deckNumber].at(-1);
        if (lastCard !== undefined) {
          lastCard.isFlipped = true;
        }

        return newPilesData;
      });
    }
  };

  return (
    <div className="game-area-container">
      {!isStarted && <StartGame triggerGame={onClickStartGame} />}
      {isStarted && validSetCount < 8 && (
        <div className="game-board-main-container">
          <nav className="nav-score-container">
            <img
              className="nav-logo"
              src="https://res.cloudinary.com/diuvnny8c/image/upload/v1727533075/Solitaire-logo_b0cqbm.png"
            />

            <h2 className="score-head">
              Score: <span className="score-value">{score}</span>
            </h2>
          </nav>
          <div className="main-piles-container">
            {Object.keys(pilesData).map((eachKey) => (
              <div className="pile-container" key={eachKey}>
                {pilesData[eachKey].map((eachCard, index) => (
                  <div
                    className="card-container"
                    style={{
                      position: "absolute",
                      top: `${index * 25}px`,
                      left: "10px",
                    }}
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, eachKey, index)}
                    onDragEnd={(e) => handleDragEnd(e)}
                    onDrop={(e) => handleDrop(e, eachKey, index)}
                    onDragOver={(e) => handleDragOver(e)}
                  >
                    <img
                      src={
                        eachCard?.isFlipped
                          ? eachCard?.cardImgUrl
                          : "https://res.cloudinary.com/diuvnny8c/image/upload/v1727269034/kindpng_1537437_kujhfw.png"
                      }
                      className="card-img"
                    />
                  </div>
                ))}
                {pilesData[eachKey].length === 0 && (
                  <div
                    draggable
                    onDrop={(e) => handleNewDrop(e, eachKey)}
                    onDragOver={(e) => handleDragOver(e)}
                    className="card-container"
                  >
                    <img
                      src="https://res.cloudinary.com/diuvnny8c/image/upload/v1727444092/Blank-Playing-Card_fo8xoq.png"
                      className="card-img"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="extra-cards-main-container">
            {validSetCount > 0 && (
              <div className="success-cards-container">
                {Array.from({ length: validSetCount }).map((eachSet) => {
                  return (
                    <img
                      src="https://res.cloudinary.com/diuvnny8c/image/upload/v1727516053/Leonardo_Phoenix_A_regal_ornate_illustration_of_the_golden_Kin_2_uqoo7x.jpg"
                      className="success-cards"
                    />
                  );
                })}
              </div>
            )}

            {extraCards.length > 0 && (
              <img
                src="https://res.cloudinary.com/diuvnny8c/image/upload/v1727269034/kindpng_1537437_kujhfw.png"
                className="extra-cards"
                onClick={onClickExtraCards}
              />
            )}
          </div>
          {showConfetti && <Confetti width={width} height={height} />}
        </div>
      )}
      {validSetCount === 8 && <GameSuccess totalScore={score} />}
    </div>
  );
};

export default GameArea;
