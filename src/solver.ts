export class Puzzle {
  xSize: number;
  ySize: number;
  content: number[];

  constructor(xSize: number, ySize: number, content: number[]) {
    this.xSize = xSize;
    this.ySize = ySize;
    this.content = [...content];
  }

  clockwiseRotate90(): void {
    const newContent = new Array(this.content.length).fill(0);
    const newXSize = this.ySize;
    const newYSize = this.xSize;

    for (let y = 0; y < this.ySize; y++) {
      for (let x = 0; x < this.xSize; x++) {
        const newX = this.ySize - 1 - y;
        const newY = x;

        const newIndex = newY * newXSize + newX;
        const oldIndex = y * this.xSize + x;

        newContent[newIndex] = this.content[oldIndex];
      }
    }

    this.content = newContent;
    this.xSize = newXSize;
    this.ySize = newYSize;
  }

  clone(): Puzzle {
    return new Puzzle(this.xSize, this.ySize, this.content);
  }
}

export interface BoardInfo {
  colX: number;
  rowY: number;
  targetXSum: number[];
  targetYSum: number[];
  fixedPos: Map<string, number>; // key: "x,y"
}

export interface Solution {
  board: number[][];
  boardID: number[][];
}

export class Solver {
  board: number[][];
  boardID: number[][];
  rowUsed: number[];
  colUsed: number[];
  used: boolean[];
  puzzles: Puzzle[];
  info: BoardInfo;
  solutions: Solution[];
  seen: Set<string>;

  constructor(puzzles: Puzzle[], info: BoardInfo) {
    this.board = Array.from({ length: info.rowY }, () => new Array(info.colX).fill(0));
    this.boardID = Array.from({ length: info.rowY }, () => new Array(info.colX).fill(0));
    this.rowUsed = new Array(info.rowY).fill(0);
    this.colUsed = new Array(info.colX).fill(0);
    this.used = new Array(puzzles.length).fill(false);
    this.puzzles = puzzles;
    this.info = info;
    this.solutions = [];
    this.seen = new Set<string>();

    for (const [posStr, val] of info.fixedPos.entries()) {
      const [x, y] = posStr.split(',').map(Number);
      this.board[y][x] = val === 0 ? -1 : val; // -1 represents fixed 0
      if (val === 1) {
        this.boardID[y][x] = -1; // -1 ID for fixed 1
        this.rowUsed[y]++;
        this.colUsed[x]++;
      }
    }
  }

  canPlace(p: Puzzle, sx: number, sy: number): boolean {
    for (let y = 0; y < p.ySize; y++) {
      for (let x = 0; x < p.xSize; x++) {
        if (p.content[y * p.xSize + x] === 0) continue;

        const bx = sx + x;
        const by = sy + y;

        if (bx >= this.info.colX || by >= this.info.rowY) return false;
        if (this.board[by][bx] !== 0) return false; // Cannot place on 1 or -1
        if (this.rowUsed[by] + 1 > this.info.targetYSum[by]) return false;
        if (this.colUsed[bx] + 1 > this.info.targetXSum[bx]) return false;
      }
    }
    return true;
  }

  place(p: Puzzle, sx: number, sy: number, val: number, pid: number): void {
    for (let y = 0; y < p.ySize; y++) {
      for (let x = 0; x < p.xSize; x++) {
        if (p.content[y * p.xSize + x] === 0) continue;

        const bx = sx + x;
        const by = sy + y;

        this.board[by][bx] = val;

        if (val === 1) {
          this.boardID[by][bx] = pid;
          this.rowUsed[by]++;
          this.colUsed[bx]++;
        } else {
          this.boardID[by][bx] = 0;
          this.rowUsed[by]--;
          this.colUsed[bx]--;
        }
      }
    }
  }

  remainCheck(): boolean {
    for (let y = 0; y < this.info.rowY; y++) {
      let empty = 0;
      for (let x = 0; x < this.info.colX; x++) {
        if (this.board[y][x] === 0) empty++;
      }
      const need = this.info.targetYSum[y] - this.rowUsed[y];
      if (need < 0 || need > empty) return false;
    }

    for (let x = 0; x < this.info.colX; x++) {
      let empty = 0;
      for (let y = 0; y < this.info.rowY; y++) {
        if (this.board[y][x] === 0) empty++;
      }
      const need = this.info.targetXSum[x] - this.colUsed[x];
      if (need < 0 || need > empty) return false;
    }

    return true;
  }

  finalCheck(): boolean {
    for (let y = 0; y < this.info.rowY; y++) {
      if (this.rowUsed[y] !== this.info.targetYSum[y]) return false;
    }
    for (let x = 0; x < this.info.colX; x++) {
      if (this.colUsed[x] !== this.info.targetXSum[x]) return false;
    }
    return true;
  }

  boardHash(): string {
    let hash = '';
    for (let y = 0; y < this.info.rowY; y++) {
      for (let x = 0; x < this.info.colX; x++) {
        hash += this.board[y][x] === 1 ? '1' : '0';
      }
      hash += '|';
    }
    return hash;
  }

  dfs(depth: number): void {
    if (depth === this.puzzles.length) {
      if (!this.finalCheck()) return;

      const hash = this.boardHash();
      if (this.seen.has(hash)) return;

      this.seen.add(hash);
      
      this.solutions.push({
        board: this.board.map(row => [...row]),
        boardID: this.boardID.map(row => [...row])
      });
      return;
    }

    if (!this.remainCheck()) return;

    let idx = -1;
    for (let i = 0; i < this.puzzles.length; i++) {
      if (!this.used[i]) {
        idx = i;
        break;
      }
    }

    if (idx === -1) return;

    this.used[idx] = true;

    const rots = rotations(this.puzzles[idx]);
    for (const p of rots) {
      for (let y = 0; y <= this.info.rowY - p.ySize; y++) {
        for (let x = 0; x <= this.info.colX - p.xSize; x++) {
          if (!this.canPlace(p, x, y)) continue;

          this.place(p, x, y, 1, idx + 1);
          this.dfs(depth + 1);
          this.place(p, x, y, 0, 0);
        }
      }
    }

    this.used[idx] = false;
  }

  solveAllUnique(): Solution[] {
    this.solutions = [];
    this.dfs(0);
    return this.solutions;
  }
}

function rotations(p: Puzzle): Puzzle[] {
  const res: Puzzle[] = [];
  const seen = new Set<string>();

  const cur = p.clone();

  for (let i = 0; i < 4; i++) {
    const key = `${cur.xSize}_${cur.ySize}_${cur.content.join(',')}`;
    if (!seen.has(key)) {
      seen.add(key);
      res.push(cur.clone());
    }
    cur.clockwiseRotate90();
  }

  return res;
}
