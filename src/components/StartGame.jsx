import React from "react";
import "../styles/StartGame.css";
import { GiPokerHand } from "react-icons/gi";

const StartGame = (props) => {
  const { triggerGame } = props;

  return (
    <div className="start-game-main-container">
      <div className="start-game-container">
        <button className="start-btn" onClick={() => triggerGame()}>
          <span>Start</span>
          <GiPokerHand className="card-icon" />
        </button>
      </div>
    </div>
  );
};

export default StartGame;
