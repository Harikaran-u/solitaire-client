import React from "react";
import "../styles/GameArea.css";

import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import StartGame from "./StartGame";

const cardKeySet = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const GameArea = () => {
  const [client, setClient] = useState(null);
  const [pilesData, setPilesData] = useState([]);
  const [extraCards, setExtraCards] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isExtraCardAvailable, setIsExtraCardsAvailable] = useState(true);

  useEffect(() => {
    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("Connected to web Socket");
        stompClient.subscribe("/topic/cardList", (message) => {
          const pilesData = JSON.parse(message.body);
          setPilesData(pilesData);
        });
        stompClient.subscribe("/topic/extraCards", (message) => {
          const extraCards = JSON.parse(message.body);
          setExtraCards(extraCards);
        });
        stompClient.subscribe("/topic/updatedCards", (message) => {
          const updatedPilesData = JSON.parse(message.body);
          setPilesData(updatedPilesData);
          console.log("state updated through updated cards subscribe");
        });
      },
      onStompError: (frame) => {
        console.error("Broker Error: " + frame.headers["message"]);
      },
    });
    stompClient.activate();
    setClient(stompClient);

    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, []);

  const getPileCards = () => {
    if (client) {
      client.publish({ destination: "/app/cards/piles" });
    }
  };

  const getExtraCards = () => {
    if (client) {
      client.publish({ destination: "/app/cards/extra" });
    }
  };

  const onClickStartGame = () => {
    setIsStarted(true);
    getPileCards();
    getExtraCards();
  };

  const onClickExtraCards = () => {
    const cardSet = extraCards.slice(0, 10);
    cardSet.forEach((eachCard) => (eachCard.isFlipped = true));
    setExtraCards(extraCards.slice(10));
    setPilesData((prevPiles) => {
      const updatedPiles = { ...prevPiles };
      cardKeySet.forEach((eachKey) => {
        const index = parseInt(eachKey) - 1;
        if (cardSet[index]) {
          updatedPiles[eachKey] = [...prevPiles[eachKey], cardSet[index]];
        }
      });
      if (client) {
        client.publish({
          destination: "/app/cards/updated",
          body: JSON.stringify(updatedPiles),
        });
      }
      return updatedPiles;
    });

    if (extraCards.length === 10) {
      setIsExtraCardsAvailable(false);
    }
  };

  return (
    <div className="game-area-container">
      {!isStarted && <StartGame triggerGame={onClickStartGame} />}
      {isStarted && (
        <div className="game-board-main-container">
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
                  >
                    <img
                      src={
                        eachCard.isFlipped
                          ? eachCard.cardImgUrl
                          : "https://res.cloudinary.com/diuvnny8c/image/upload/v1727269034/kindpng_1537437_kujhfw.png"
                      }
                      className="card-img"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          {isExtraCardAvailable && (
            <div
              className="extra-cards-main-container"
              onClick={onClickExtraCards}
            >
              <img
                src="https://res.cloudinary.com/diuvnny8c/image/upload/v1727269034/kindpng_1537437_kujhfw.png"
                className="extra-cards"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameArea;
