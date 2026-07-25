// Darkstorm Paragon Planner
// Version 0.3.1

const boardCanvas = document.getElementById("boardCanvas");
const boardSelect = document.getElementById("boardSelect");
const newBoardButton = document.getElementById("newBoard");

const ctx = boardCanvas.getContext("2d");

// Match the canvas resolution to its displayed size
function resizeCanvas() {
    boardCanvas.width = boardCanvas.clientWidth;
    boardCanvas.height = boardCanvas.clientHeight;

    drawWelcomeScreen();
}

function drawWelcomeScreen() {

    ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

    ctx.fillStyle = "#66e0a3";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "Darkstorm Paragon Planner",
        boardCanvas.width / 2,
        boardCanvas.height / 2 - 20
    );

    ctx.fillStyle = "#b9c2cc";
    ctx.font = "18px Arial";

    ctx.fillText(
        "Project initialized successfully.",
        boardCanvas.width / 2,
        boardCanvas.height / 2 + 20
    );
}

newBoardButton.addEventListener("click", () => {

    alert("Board creation is coming in v0.4!");

});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();