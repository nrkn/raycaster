"use strict";
//
// util
const assrt = (value, message = 'Expected value, saw null or undefined instead') => {
    if (value === null || value === undefined)
        throw Error(message);
    return value;
};
const seq = (length, cb) => Array.from({ length }, (_v, k) => cb(k));
const toRadians = (deg) => (deg * Math.PI) / 180;
const distance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
//
const map = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
];
const CELL_SIZE = 32;
const FOV = toRadians(60);
const COLORS = {
    floor: '#d52b1e',
    ceiling: '#ffffff',
    wall: '#013aa6',
    wallDark: '#012975',
    rays: '#ffa600',
};
const player = {
    x: CELL_SIZE * 1.5,
    y: CELL_SIZE * 2,
    rads: toRadians(0),
    speed: 0,
};
//
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const context = assrt(canvas.getContext('2d'), 'Failed to create 2D canvas context');
// 
let screenWidth = innerWidth;
let screenHeight = innerHeight;
let rays = seq(screenWidth, () => ({ rads: 0, distance: 0, vertical: false }));
let frame1 = 0;
let frame2 = 0;
let elapsed = 0;
//
const resize = () => {
    canvas.width = screenWidth = innerWidth;
    canvas.height = screenHeight = innerHeight;
    rays = seq(screenWidth, () => ({ rads: 0, distance: 0, vertical: false }));
};
const clearScreen = () => {
    context.fillStyle = 'red';
    context.fillRect(0, 0, screenWidth, screenHeight);
};
const renderMinimap = (posX = 0, posY = 0, scale, rays) => {
    const cellSize = scale * CELL_SIZE;
    map.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                context.fillStyle = 'grey';
                context.fillRect(posX + x * cellSize, posY + y * cellSize, cellSize, cellSize);
            }
        });
    });
    context.fillStyle = 'blue';
    context.fillRect(posX + player.x * scale - 10 / 2, posY + player.y * scale - 10 / 2, 10, 10);
    context.strokeStyle = 'blue';
    context.beginPath();
    context.moveTo(player.x * scale, player.y * scale);
    context.lineTo((player.x + Math.cos(player.rads) * 20) * scale, (player.y + Math.sin(player.rads) * 20) * scale);
    context.closePath();
    context.stroke();
    context.strokeStyle = COLORS.rays;
    rays.forEach((ray) => {
        context.beginPath();
        context.moveTo(player.x * scale, player.y * scale);
        context.lineTo((player.x + Math.cos(ray.rads) * ray.distance) * scale, (player.y + Math.sin(ray.rads) * ray.distance) * scale);
        context.closePath();
        context.stroke();
    });
};
const outOfMapBounds = (x, y) => x < 0 || x >= map[0].length || y < 0 || y >= map.length;
const getVCollision = (rads) => {
    const right = Math.abs(Math.floor((rads - Math.PI / 2) / Math.PI) % 2);
    const firstX = right
        ? Math.floor(player.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE
        : Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
    const firstY = player.y + (firstX - player.x) * Math.tan(rads);
    const xA = right ? CELL_SIZE : -CELL_SIZE;
    const yA = xA * Math.tan(rads);
    let wall;
    let nextX = firstX;
    let nextY = firstY;
    while (!wall) {
        const cellX = right
            ? Math.floor(nextX / CELL_SIZE)
            : Math.floor(nextX / CELL_SIZE) - 1;
        const cellY = Math.floor(nextY / CELL_SIZE);
        if (outOfMapBounds(cellX, cellY)) {
            break;
        }
        wall = map[cellY][cellX];
        if (!wall) {
            nextX += xA;
            nextY += yA;
        }
        else {
        }
    }
    return {
        rads,
        distance: distance(player.x, player.y, nextX, nextY),
        vertical: true,
    };
};
const getHCollision = (rads) => {
    const up = Math.abs(Math.floor(rads / Math.PI) % 2);
    const firstY = up
        ? Math.floor(player.y / CELL_SIZE) * CELL_SIZE
        : Math.floor(player.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE;
    const firstX = player.x + (firstY - player.y) / Math.tan(rads);
    const yA = up ? -CELL_SIZE : CELL_SIZE;
    const xA = yA / Math.tan(rads);
    let wall;
    let nextX = firstX;
    let nextY = firstY;
    while (!wall) {
        const cellX = Math.floor(nextX / CELL_SIZE);
        const cellY = up
            ? Math.floor(nextY / CELL_SIZE) - 1
            : Math.floor(nextY / CELL_SIZE);
        if (outOfMapBounds(cellX, cellY)) {
            break;
        }
        wall = map[cellY][cellX];
        if (!wall) {
            nextX += xA;
            nextY += yA;
        }
    }
    return {
        rads,
        distance: distance(player.x, player.y, nextX, nextY),
        vertical: false,
    };
};
const castRay = (rads) => {
    const vCollision = getVCollision(rads);
    const hCollision = getHCollision(rads);
    return hCollision.distance >= vCollision.distance ? vCollision : hCollision;
};
const fixFishEye = (distance, rads, playerRads) => {
    const diff = rads - playerRads;
    return distance * Math.cos(diff);
};
const getRays = () => {
    const initialRads = player.rads - FOV / 2;
    const numberOfRays = screenWidth;
    const radStep = FOV / numberOfRays;
    for (let i = 0; i < screenWidth; i++) {
        rays[i] = castRay(initialRads + i * radStep);
    }
    return rays;
};
const movePlayer = () => {
    player.x += Math.cos(player.rads) * player.speed;
    player.y += Math.sin(player.rads) * player.speed;
};
const renderScene = (rays) => {
    rays.forEach((ray, i) => {
        const distance = fixFishEye(ray.distance, ray.rads, player.rads);
        const wallHeight = ((CELL_SIZE * 5) / distance) * 277;
        context.fillStyle = ray.vertical ? COLORS.wallDark : COLORS.wall;
        context.fillRect(i, screenHeight / 2 - wallHeight / 2, 1, wallHeight);
        context.fillStyle = COLORS.floor;
        context.fillRect(i, screenHeight / 2 + wallHeight / 2, 1, screenHeight / 2 - wallHeight / 2);
        context.fillStyle = COLORS.ceiling;
        context.fillRect(i, 0, 1, screenHeight / 2 - wallHeight / 2);
    });
};
let fpsBuffer = Array(60).fill(60);
const gameLoop = (time) => {
    frame2 = time;
    elapsed = (frame2 - frame1);
    frame1 = time;
    clearScreen();
    movePlayer();
    const rays = getRays();
    renderScene(rays);
    renderMinimap(0, 0, 0.75, rays);
    fpsBuffer.push(1000 / elapsed);
    fpsBuffer = fpsBuffer.slice(1);
    const fps = fpsBuffer.reduce((prev, curr) => prev + curr) / fpsBuffer.length;
    context.fillStyle = '#ff0';
    context.font = '32px sans-serif';
    context.fillText(`${fps | 0}`.padStart(3, ' ') + 'fps', screenWidth - 96, 32);
    requestAnimationFrame(gameLoop);
};
addEventListener('resize', resize);
addEventListener('click', () => {
    canvas.requestPointerLock();
});
addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') {
        player.speed = 2;
    }
    if (e.key === 'ArrowDown') {
        player.speed = -2;
    }
});
addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        player.speed = 0;
    }
});
addEventListener('mousemove', function (event) {
    player.rads += toRadians(event.movementX);
});
//
resize();
requestAnimationFrame(gameLoop);
