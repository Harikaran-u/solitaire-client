import React from "react";
import "../styles/GameSuccess.css";

const GameSuccess = (props) => {
  const { totalScore } = props;
  return (
    <div className="game-success-container">
      <div className="success-msg-container">
        <h1 className="match-won-text">
          <span className="joy-text">Hurray!!! </span>You won the match
        </h1>
        <p className="total-score-text">Total Score</p>
        <h1 className="score-highlight">{totalScore}</h1>
      </div>
    </div>
  );
};

export default GameSuccess;
