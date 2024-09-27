import React, { useRef } from "react";
import "../styles/GameArea.css";

import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import StartGame from "./StartGame";

// const cardKeySet = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const GameArea = () => {
  const [pilesData, setPilesData] = useState([]);
  const [extraCards, setExtraCards] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
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
          stompClient.subscribe("/topic/cardList", (message) => {
            const pilesData = JSON.parse(message.body);
            setPilesData(pilesData);
          });
          stompClient.subscribe("/topic/extraCards", (message) => {
            const extraCards = JSON.parse(message.body);
            setExtraCards(extraCards);
          });
          // stompClient.subscribe("/topic/updatedCards", (message) => {
          //   console.log(message.body);
          // });
        }
      },
      onStompError: (frame) => {
        console.error("Broker Error: " + frame.headers["message"]);
      },
      onWebSocketClose: () => {
        console.log("connection lost");
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

  const onClickStartGame = () => {
    setIsStarted(true);
    getPileCards();
    getExtraCards();
  };

  const onClickExtraCards = () => {
    const cardSet = extraCards.slice(0, 10);
    setExtraCards((prevExtraCards) => prevExtraCards.slice(10));

    setPilesData((prevPiles) => {
      const newPilesData = {};
      const keySet = Object.keys(prevPiles);
      keySet.forEach((key) => {
        const keyIndex = parseInt(key);
        newPilesData[key] = [...prevPiles[key], cardSet[keyIndex - 1]];
      });
      return newPilesData;
    });
  };

  // useEffect(() => {
  //   if (clientRef.current && clientRef.current.connected) {
  //     console.log("inside request");
  //     clientRef.current.publish({
  //       destination: "/app/cards/updated",
  //       body: JSON.stringify(pilesData),
  //     });
  //   }
  // }, [pilesData]);

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
          {extraCards.length > 0 && (
            <div className="extra-cards-main-container">
              <img
                src="https://res.cloudinary.com/diuvnny8c/image/upload/v1727269034/kindpng_1537437_kujhfw.png"
                className="extra-cards"
                onClick={onClickExtraCards}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameArea;
