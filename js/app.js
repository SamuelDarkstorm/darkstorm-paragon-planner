// Darkstorm Paragon Planner
// Version 0.3.1

const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");

const NODE_RADIUS = 18;
const NODE_GAP = 58;
const POINT_BUDGET = 172;

const nodes = [];
const selectedNodes = [];
const legalNextNodes = new Set();

const layout = [
    [0, 0, "N", 0, 0],
    [0, "M", "N", "R", 0],
    ["G", "N", "S", "N", "X"],
    [0, "M", "N", "L", 0],
    [0, 0, "N", 0, 0]
];


function buildNodes() {
    nodes.length = 0;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let row = 0; row < layout.length; row++) {
    for (let column = 0; column < layout[row].length; column++) {

        const nodeType = layout[row][column];

        if (nodeType === 0) {
            continue;
        }

        nodes.push({
            id: `${row}-${column}`,
            row,
            column,
            type: nodeType,
            x: centerX + (column - 2) * NODE_GAP,
            y: centerY + (row - 2) * NODE_GAP
        });
    }
}
    if (selectedNodes.length === 0) {
        const startNode = nodes.find(
    node => node.type === "S"
);


        if (startNode) {
            selectedNodes.push(startNode.id);
        }
    }

    updateLegalNextNodes();
}

function getNodeByPosition(row, column) {
    return nodes.find(
        node => node.row === row && node.column === column
    );
}

function getNeighbors(node) {
    const positions = [
        [node.row - 1, node.column],
        [node.row + 1, node.column],
        [node.row, node.column - 1],
        [node.row, node.column + 1]
    ];

    return positions
        .map(([row, column]) => getNodeByPosition(row, column))
        .filter(Boolean);
}

function updateLegalNextNodes() {
    legalNextNodes.clear();

    for (const selectedId of selectedNodes) {
        const selectedNode = nodes.find(
            node => node.id === selectedId
        );

        if (!selectedNode) {
            continue;
        }

        for (const neighbor of getNeighbors(selectedNode)) {
            if (!selectedNodes.includes(neighbor.id)) {
                legalNextNodes.add(neighbor.id);
            }
        }
    }
}

function drawConnections() {
    ctx.lineWidth = 4;

    for (const node of nodes) {
        for (const neighbor of getNeighbors(node)) {
            const alreadyDrawn =
                neighbor.row < node.row ||
                (
                    neighbor.row === node.row &&
                    neighbor.column < node.column
                );

            if (alreadyDrawn) {
                continue;
            }

            const bothSelected =
                selectedNodes.includes(node.id) &&
                selectedNodes.includes(neighbor.id);

            ctx.strokeStyle = bothSelected
                ? "#66e0a3"
                : "#39424d";

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.stroke();
        }
    }
}

function drawNodes() {  
    for (const node of nodes) {
        const selected = selectedNodes.includes(node.id);
        const legal = legalNextNodes.has(node.id);
        const selectedIndex = selectedNodes.indexOf(node.id);
        const isStartNode = selectedIndex === 0;
        const nodeType = node.type;
        ctx.beginPath();
        ctx.arc(
            node.x,
            node.y,
            NODE_RADIUS,
            0,
            Math.PI * 2
        );

       if (selected) {
    ctx.fillStyle = "#66e0a3";
} else {
    switch (nodeType) {
        case "S":
            ctx.fillStyle = "#f2f4f7";
            break;

        case "N":
            ctx.fillStyle = "#7f8995";
            break;

        case "M":
            ctx.fillStyle = "#4aa8ff";
            break;

        case "R":
            ctx.fillStyle = "#ffd54d";
            break;

        case "L":
            ctx.fillStyle = "#ff8c42";
            break;

        case "X":
            ctx.fillStyle = "#b96cff";
            break;

        case "G":
            ctx.fillStyle = "#d8dde5";
            break;

        default:
            ctx.fillStyle = "#7f8995";
    }
}

        ctx.fill();

        ctx.lineWidth = legal ? 4 : 3;

        if (legal) {
            ctx.strokeStyle = "#efff73";
        } else if (isStartNode) {
            ctx.strokeStyle = "#66e0a3";
        } else if (selected) {
            ctx.strokeStyle = "#d9ffe9";
        } else {
            ctx.strokeStyle = "#252b33";
        }

        ctx.stroke();

        if (selected) {
            ctx.fillStyle = "#07130d";
            ctx.font = "bold 13px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (isStartNode) {
                ctx.fillText("S", node.x, node.y);
            } else {
                ctx.fillText(
                    selectedIndex,
                    node.x,
                    node.y
                );
            }
        }
    }
}

function drawBoard() {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "#111418";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawConnections();
    drawNodes();

    const spentPoints = Math.max(
        0,
        selectedNodes.length - 1
    );

    const remainingPoints =
        POINT_BUDGET - spentPoints;

    ctx.fillStyle = "#e5e5e5";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.fillText(
        `Selected points: ${spentPoints}`,
        20,
        30
    );

    ctx.fillText(
        `Remaining from ${POINT_BUDGET}: ${remainingPoints}`,
        20,
        55
    );
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    buildNodes();
    drawBoard();
}


function getClickedNode(event) {
    const rect = canvas.getBoundingClientRect();

    const scaleX =
        canvas.width / rect.width;

    const scaleY =
        canvas.height / rect.height;

    const pointerX =
        (event.clientX - rect.left) * scaleX;

    const pointerY =
        (event.clientY - rect.top) * scaleY;

    return nodes.find(node => {
        return Math.hypot(
            pointerX - node.x,
            pointerY - node.y
        ) <= NODE_RADIUS;
    });
}

function removeLastNode(clickedNode) {
    const lastSelectedId =
        selectedNodes[selectedNodes.length - 1];

    if (clickedNode.id !== lastSelectedId) {
        return;
    }

    if (selectedNodes.length === 1) {
        return;
    }

    selectedNodes.pop();

    updateLegalNextNodes();
    drawBoard();
}

canvas.addEventListener("click", event => {
    const clickedNode = getClickedNode(event);

    if (!clickedNode) {
        return;
    }

    if (selectedNodes.includes(clickedNode.id)) {
        removeLastNode(clickedNode);
        return;
    }

    if (!legalNextNodes.has(clickedNode.id)) {
        return;
    }

    const spentPoints = Math.max(
        0,
        selectedNodes.length - 1
    );

    if (spentPoints >= POINT_BUDGET) {
        return;
    }

    selectedNodes.push(clickedNode.id);

    updateLegalNextNodes();
    drawBoard();
});

window.addEventListener(
    "resize",
    resizeCanvas
);

resizeCanvas();