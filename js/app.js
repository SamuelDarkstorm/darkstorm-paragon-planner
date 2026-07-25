// Darkstorm Paragon Planner
// Version 0.3.1

const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");

const NODE_RADIUS = 18;
const NODE_GAP = 58;

const nodes = [];
const selectedNodes = new Set();

const layout = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0]
];

function buildNodes() {
    nodes.length = 0;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const rows = layout.length;
    const columns = layout[0].length;

    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            if (layout[row][column] !== 1) {
                continue;
            }

            const x =
                centerX +
                (column - Math.floor(columns / 2)) * NODE_GAP;

            const y =
                centerY +
                (row - Math.floor(rows / 2)) * NODE_GAP;

            nodes.push({
                id: `${row}-${column}`,
                row,
                column,
                x,
                y
            });
        }
    }
}

function drawConnections() {
    ctx.strokeStyle = "#39424d";
    ctx.lineWidth = 4;

    for (const node of nodes) {
        const rightNeighbor = nodes.find(
            other =>
                other.row === node.row &&
                other.column === node.column + 1
        );

        const lowerNeighbor = nodes.find(
            other =>
                other.row === node.row + 1 &&
                other.column === node.column
        );

        for (const neighbor of [rightNeighbor, lowerNeighbor]) {
            if (!neighbor) {
                continue;
            }

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.stroke();
        }
    }
}

function drawNodes() {
    for (const node of nodes) {
        const selected = selectedNodes.has(node.id);

        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

        ctx.fillStyle = selected ? "#66e0a3" : "#7f8995";
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = selected ? "#d9ffe9" : "#252b33";
        ctx.stroke();
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#111418";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawConnections();
    drawNodes();

    ctx.fillStyle = "#e5e5e5";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Selected points: ${selectedNodes.size}`, 20, 30);
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    buildNodes();
    drawBoard();
}

function getClickedNode(event) {
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    return nodes.find(node => {
        const distance = Math.hypot(
            mouseX - node.x,
            mouseY - node.y
        );

        return distance <= NODE_RADIUS;
    });
}

canvas.addEventListener("click", event => {
    const clickedNode = getClickedNode(event);

    if (!clickedNode) {
        return;
    }

    if (selectedNodes.has(clickedNode.id)) {
        selectedNodes.delete(clickedNode.id);
    } else {
        selectedNodes.add(clickedNode.id);
    }

    drawBoard();
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();