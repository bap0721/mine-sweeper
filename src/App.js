import React, { useState, useEffect } from 'react';
import './App.css';
import { ethers } from 'ethers';

const BOARD_SIZE = 10;
const MINES_COUNT = 10;

const generateBoard = () => {
  const board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill({ mine: false, revealed: false, flagged: false, count: 0 }));

  let minesPlaced = 0;
  while (minesPlaced < MINES_COUNT) {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    if (!board[row][col].mine) {
      board[row][col] = { ...board[row][col], mine: true };
      minesPlaced++;
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board[r][c].mine) {
        let mines = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = r + i;
            const nc = c + j;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
              if (board[nr][nc].mine) mines++;
            }
          }
        }
        board[r][c] = { ...board[r][c], count: mines };
      }
    }
  }

  return board;
};

const Cell = ({ cell, onClick, onRightClick }) => {
  let className = 'cell';
  if (cell.revealed) className += ' revealed';
  if (cell.flagged) className += ' flagged';
  if (cell.revealed && !cell.mine && cell.count > 0) {
    className += ` cell-${cell.count}`;
  }

  return (
    <div
      className={className}
      onClick={onClick}
      onContextMenu={onRightClick}
    >
      {cell.revealed
        ? cell.mine
          ? '💣'
          : cell.count > 0
          ? cell.count
          : ''
        : cell.flagged
        ? '🚩'
        : ''}
    </div>
  );
};

const App = () => {
  const [board, setBoard] = useState(generateBoard);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [hasTurn, setHasTurn] = useState(false);
  const [playsPurchased, setPlaysPurchased] = useState(0);
  const [playsUsed, setPlaysUsed] = useState(0);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setAccount(accounts[0]);
        setSigner(signer);
      } catch (err) {
        console.error("Wallet connection error:", err);
      }
    } else {
      alert("🦊 Please install Metamask to use this feature.");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setHasTurn(false);
    setPlaysPurchased(0);
    setPlaysUsed(0);
  };

  const purchaseGame = async () => {
    if (!signer) {
      alert("Please connect your wallet first.");
      return;
    }

    const contractAddress = "0xc95F821C2299d8e4845aEbc6164D9973cbF68c9F";
    const abi = [
      {
        "inputs": [],
        "name": "purchaseGame",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      }
    ];

    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.purchaseGame({
        value: ethers.parseEther("0.01")
      });
      await tx.wait();
      alert("✅ Purchase successful! You received 5 turns.");
      setHasTurn(true);
      setPlaysPurchased(playsPurchased + 5);
    } catch (error) {
      console.error("Purchase failed:", error);
      alert("❌ Transaction failed. See console for details.");
    }
  };

  const reveal = (r, c, b) => {
    if (b[r][c].revealed || b[r][c].flagged) return;
    b[r][c].revealed = true;
    if (b[r][c].mine) {
      setGameOver(true);
      setPlaysUsed(prev => prev + 1);
      return;
    }
    if (b[r][c].count === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const nr = r + i;
          const nc = c + j;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            if (!b[nr][nc].revealed) {
              reveal(nr, nc, b);
            }
          }
        }
      }
    }
  };

  const handleClick = (r, c) => {
    if (!hasTurn || gameOver || win) return;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    reveal(r, c, newBoard);
    setBoard(newBoard);
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (!hasTurn || gameOver || win) return;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    newBoard[r][c].flagged = !newBoard[r][c].flagged;
    setBoard(newBoard);
  };

  useEffect(() => {
    if (!gameOver && !win) {
      const totalCells = BOARD_SIZE * BOARD_SIZE;
      const revealed = board.flat().filter(cell => cell.revealed).length;
      if (revealed === totalCells - MINES_COUNT) {
        setWin(true);
        setPlaysUsed(prev => prev + 1);
      }
    }
  }, [board, gameOver]);

  const resetGame = () => {
    setBoard(generateBoard());
    setGameOver(false);
    setWin(false);
    setHasTurn(playsPurchased - playsUsed - 1 >= 0);
  };

  const playsRemaining = Math.max(playsPurchased - playsUsed, 0);

  return (
    <div className="game">
      <div className="wallet-bar">
        <button onClick={account ? disconnectWallet : connectWallet} className="wallet-button">
          {account ? `🔗 ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
        </button>
        {account && !hasTurn && (
          <button onClick={purchaseGame} className="wallet-button">
            🪙 Purchase Turn (0.01 MON)
          </button>
        )}
      </div>

      <h1>Minesweeper</h1>
      <div className="play-stats">
        <span>📒 Purchased: {playsPurchased}</span>
        <span>🕹️ Played: {playsUsed}</span>
        <span>📘 Remaining: {playsRemaining}</span>
      </div>

      {gameOver && <h2 className="status">💥 Game Over! You hit a mine!</h2>}
      {win && <h2 className="status">🎉 You Win!</h2>}
      {!gameOver && !win && playsRemaining === 0 && <h2 className="status">🪙 Purchase a turn to play</h2>}

      <div className="board">
        {board.map((row, r) => (
          <div key={r} className="row">
            {row.map((cell, c) => (
              <Cell
                key={c}
                cell={cell}
                onClick={() => handleClick(r, c)}
                onRightClick={(e) => handleRightClick(e, r, c)}
              />
            ))}
          </div>
        ))}
      </div>

      <button className="reset" onClick={resetGame}>🔄 Reset</button>
    </div>
  );
};

export default App;
