//

type Ray = {
  rads: number
  distance: number
  vertical: boolean
}

// util

const assrt = <T>(
  value: T | null | undefined,
  message = 'Expected value, saw null or undefined instead'
) => {
  if (value === null || value === undefined) throw Error(message)

  return value
}

const seq = <T>(length: number, cb: (i: number) => T) =>
  Array.from({ length }, (_v, k) => cb(k))

const toRadians = (deg: number) => (deg * Math.PI) / 180

const distance = (
  x1: number, y1: number, x2: number, y2: number
) =>
  Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

//

const map = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
]

const CELL_SIZE = 32

const FOV = toRadians(60)

const COLORS = {
  floor: '#d52b1e', // '#ff6361'
  ceiling: '#ffffff', // '#012975',
  wall: '#013aa6', // '#58508d'
  wallDark: '#012975', // '#003f5c'
  rays: '#ffa600',
}

const player = {
  x: CELL_SIZE * 1.5,
  y: CELL_SIZE * 2,
  rads: toRadians(0),
  speed: 0,
}

//

const canvas = document.createElement('canvas')

document.body.appendChild(canvas)

const context = assrt(canvas.getContext('2d'))

// 

let screenWidth = innerWidth
let screenHeight = innerHeight

//

const resize = () => {
  canvas.width = screenWidth = innerWidth
  canvas.height = screenHeight = innerHeight
}

const clearScreen = () => {
  context.fillStyle = 'red'
  context.fillRect(0, 0, screenWidth, screenHeight)
}

const renderMinimap = (posX = 0, posY = 0, scale: number, rays: Ray[]) => {
  const cellSize = scale * CELL_SIZE

  map.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        context.fillStyle = 'grey'
        context.fillRect(
          posX + x * cellSize,
          posY + y * cellSize,
          cellSize,
          cellSize
        )
      }
    })
  })

  context.fillStyle = 'blue'
  context.fillRect(
    posX + player.x * scale - 10 / 2,
    posY + player.y * scale - 10 / 2,
    10,
    10
  )

  context.strokeStyle = 'blue'
  context.beginPath()
  context.moveTo(player.x * scale, player.y * scale)
  context.lineTo(
    (player.x + Math.cos(player.rads) * 20) * scale,
    (player.y + Math.sin(player.rads) * 20) * scale
  )
  context.closePath()
  context.stroke()

  context.strokeStyle = COLORS.rays
  rays.forEach((ray) => {
    context.beginPath()
    context.moveTo(player.x * scale, player.y * scale)
    context.lineTo(
      (player.x + Math.cos(ray.rads) * ray.distance) * scale,
      (player.y + Math.sin(ray.rads) * ray.distance) * scale
    )
    context.closePath()
    context.stroke()
  })
}

const outOfMapBounds = (x: number, y: number) =>
  x < 0 || x >= map[0].length || y < 0 || y >= map.length

const getVCollision = (rads: number): Ray => {
  const right = Math.abs(Math.floor((rads - Math.PI / 2) / Math.PI) % 2)

  const firstX = right
    ? Math.floor(player.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE
    : Math.floor(player.x / CELL_SIZE) * CELL_SIZE

  const firstY = player.y + (firstX - player.x) * Math.tan(rads)

  const xA = right ? CELL_SIZE : -CELL_SIZE
  const yA = xA * Math.tan(rads)

  let wall: number | undefined
  let nextX = firstX
  let nextY = firstY
  while (!wall) {
    const cellX = right
      ? Math.floor(nextX / CELL_SIZE)
      : Math.floor(nextX / CELL_SIZE) - 1
    const cellY = Math.floor(nextY / CELL_SIZE)

    if (outOfMapBounds(cellX, cellY)) {
      break
    }
    wall = map[cellY][cellX]
    if (!wall) {
      nextX += xA
      nextY += yA
    } else {
    }
  }
  return {
    rads,
    distance: distance(player.x, player.y, nextX, nextY),
    vertical: true,
  }
}

const getHCollision = (rads: number): Ray => {
  const up = Math.abs(Math.floor(rads / Math.PI) % 2)

  const firstY = up
    ? Math.floor(player.y / CELL_SIZE) * CELL_SIZE
    : Math.floor(player.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE

  const firstX = player.x + (firstY - player.y) / Math.tan(rads)

  const yA = up ? -CELL_SIZE : CELL_SIZE
  const xA = yA / Math.tan(rads)

  let wall: number | undefined
  let nextX = firstX
  let nextY = firstY

  while (!wall) {
    const cellX = Math.floor(nextX / CELL_SIZE)
    const cellY = up
      ? Math.floor(nextY / CELL_SIZE) - 1
      : Math.floor(nextY / CELL_SIZE)

    if (outOfMapBounds(cellX, cellY)) {
      break
    }

    wall = map[cellY][cellX]
    if (!wall) {
      nextX += xA
      nextY += yA
    }
  }
  return {
    rads,
    distance: distance(player.x, player.y, nextX, nextY),
    vertical: false,
  }
}

const castRay = (rads: number) => {
  const vCollision = getVCollision(rads)
  const hCollision = getHCollision(rads)

  return hCollision.distance >= vCollision.distance ? vCollision : hCollision
}

const fixFishEye = (distance: number, rads: number, playerRads: number) => {
  const diff = rads - playerRads

  return distance * Math.cos(diff)
}

const getRays = () => {
  const initialRads = player.rads - FOV / 2
  const numberOfRays = screenWidth
  const radStep = FOV / numberOfRays

  return seq(
    numberOfRays,
    i => castRay(initialRads + i * radStep)
  )
}

const movePlayer = () => {
  player.x += Math.cos(player.rads) * player.speed
  player.y += Math.sin(player.rads) * player.speed
}

const renderScene = (rays: Ray[]) => {
  rays.forEach((ray, i) => {
    const distance = fixFishEye(ray.distance, ray.rads, player.rads)
    const wallHeight = ((CELL_SIZE * 5) / distance) * 277
    context.fillStyle = ray.vertical ? COLORS.wallDark : COLORS.wall
    context.fillRect(i, screenHeight / 2 - wallHeight / 2, 1, wallHeight)
    context.fillStyle = COLORS.floor
    context.fillRect(
      i,
      screenHeight / 2 + wallHeight / 2,
      1,
      screenHeight / 2 - wallHeight / 2
    )
    context.fillStyle = COLORS.ceiling
    context.fillRect(i, 0, 1, screenHeight / 2 - wallHeight / 2)
  })
}

const gameLoop = (time: number) => {
  clearScreen()
  movePlayer()

  const rays = getRays()

  renderScene(rays)
  renderMinimap(0, 0, 0.75, rays)

  requestAnimationFrame(gameLoop)
}

addEventListener('resize', resize)

addEventListener('click', () => {
  canvas.requestPointerLock()
})

addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') {
    player.speed = 2
  }
  if (e.key === 'ArrowDown') {
    player.speed = -2
  }
})

addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    player.speed = 0
  }
})

addEventListener('mousemove', function (event) {
  player.rads += toRadians(event.movementX)
})

//

resize()

requestAnimationFrame(gameLoop)

