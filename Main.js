AB.clockTick       = 100;
AB.maxSteps        = 10000;
AB.drawRunControls = false;


const DEFAULT_GEMINI_API_KEY = "MyKey";
const GEMINI_MODEL = "gemini-2.5-flash-lite";



const DEFAULT_HF_API_KEY = "MyKey";
const HF_CHAT_URL = "";
const HF_MODEL = "deepseek-ai/DeepSeek-V3.2-Exp:novita";

const OBJPATH = "/uploads/starter/";
const OBJNAME = "Peter_Parker.obj";
const MTLNAME = "Peter_Parker.mtl";

const SKYBOX_ARRAY = [
  "/uploads/starter/posx.jpg",
  "/uploads/starter/negx.jpg",
  "/uploads/starter/posy.jpg",
  "/uploads/starter/negy.jpg",
  "/uploads/starter/posz.jpg",
  "/uploads/starter/negz.jpg"
];

const SCALE_HERO = 70;
const TILE_SIZE = 200;
const AGENT_Y = 0;

let MAZE = [];
let ROWS = 0, COLS = 0;
let START = { r:0, c:0 };
let TARGET = { r:0, c:0 };

function setMazeFromData(maze, start, target){
  MAZE = maze;
  ROWS = MAZE.length;
  COLS = MAZE[0].length;
  START = start;
  TARGET = target;
  MAZE[START.r][START.c] = 0;
  MAZE[TARGET.r][TARGET.c] = 0;
}

function makeRng(seed){
  let x = seed >>> 0;
  return function(){
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 0xFFFFFFFF;
  };
}

function generateMazeDFS(n, seed){
  const rng = makeRng(seed);
  const maze = Array.from({length:n}, ()=>Array(n).fill(1));
  const cellR = Math.floor((n-1)/2);
  const cellC = Math.floor((n-1)/2);

  function mR(cr){ return 1 + cr*2; }
  function mC(cc){ return 1 + cc*2; }

  const visited = Array.from({length:cellR}, ()=>Array(cellC).fill(false));

  let sr = Math.floor(rng()*cellR);
  let sc = Math.floor(rng()*cellC);
  visited[sr][sc] = true;

  const stack = [[sr,sc]];
  maze[mR(sr)][mC(sc)] = 0;

  const DIRS = [[-1,0],[0,1],[1,0],[0,-1]];

  while (stack.length){
    const [cr,cc] = stack[stack.length-1];
    const order = [0,1,2,3];
    for (let i=order.length-1;i>0;i--){
      const j = Math.floor(rng()*(i+1));
      [order[i],order[j]]=[order[j],order[i]];
    }

    let carved = false;
    for (const k of order){
      const [dr,dc] = DIRS[k];
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr<0||nc<0||nr>=cellR||nc>=cellC) continue;
      if (visited[nr][nc]) continue;

      maze[mR(cr)+dr][mC(cc)+dc] = 0;
      maze[mR(nr)][mC(nc)] = 0;

      visited[nr][nc] = true;
      stack.push([nr,nc]);
      carved = true;
      break;
    }
    if (!carved) stack.pop();
  }

  for (let i=0;i<n;i++){
    maze[0][i]=1;
    maze[n-1][i]=1;
    maze[i][0]=1;
    maze[i][n-1]=1;
  }

  function adj(r,c){
    const N=[[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dr,dc] of N){
      const rr=r+dr, cc=c+dc;
      if (rr>=0&&rr<n&&cc>=0&&cc<n && maze[rr][cc]===0) return true;
    }
    return false;
  }

  const B = [];
  for (let i=1;i<n-1;i++){
    if (adj(0,i)) B.push({r:0,c:i});
    if (adj(n-1,i)) B.push({r:n-1,c:i});
    if (adj(i,0)) B.push({r:i,c:0});
    if (adj(i,n-1)) B.push({r:i,c:n-1});
  }

  const a = Math.floor(rng()*B.length);
  let b = Math.floor(rng()*B.length);
  while (b===a) b = Math.floor(rng()*B.length);

  return { maze, start:B[a], end:B[b] };
}

const PRESET_SIZES = [10,15,20];
const PRESETS = {};
(function buildPresets(){
  for (const s of PRESET_SIZES){
    PRESETS[s] = [];
    for (let i=0;i<3;i++){
      const seed = s*1000 + (i+1)*97;
      PRESETS[s].push(generateMazeDFS(s, seed));
    }
  }
})();

function gridToWorld(r,c){
  const halfR = ROWS/2;
  const halfC = COLS/2;
  return new THREE.Vector3(
    (c-halfC)*TILE_SIZE,
    AGENT_Y,
    (r-halfR)*TILE_SIZE
  );
}
function canMoveTo(r,c){
  return !(r<0||c<0||r>=ROWS||c>=COLS) && MAZE[r][c]===0;
}
function sleep(ms){
  return new Promise(res=>setTimeout(res,ms));
}

let mazeVisualGroup = null;

function buildMazeVisuals(scene){
  if (mazeVisualGroup) scene.remove(mazeVisualGroup);
  mazeVisualGroup = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({color:0xeeeeee});
  const wallMat  = new THREE.MeshStandardMaterial({color:0x444444});

  for (let r=0;r<ROWS;r++){
    for (let c=0;c<COLS;c++){
      const pos = gridToWorld(r,c);
      if (MAZE[r][c] === 1){
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE,TILE_SIZE,TILE_SIZE),
          wallMat
        );
        wall.position.set(pos.x, TILE_SIZE/2, pos.z);
        mazeVisualGroup.add(wall);
      } else {
        const floor = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE,8,TILE_SIZE),
          floorMat
        );
        floor.position.set(pos.x, -4, pos.z);
        mazeVisualGroup.add(floor);
      }
    }
  }

  const holeMat = new THREE.MeshStandardMaterial({
    color:0xff0000,
    emissive:0xaa0000,
    transparent:true,
    opacity:0.95
  });
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(TILE_SIZE*0.28, TILE_SIZE*0.28, 12, 20),
    holeMat
  );
  const endPos = gridToWorld(TARGET.r, TARGET.c);
  hole.position.set(endPos.x, 2, endPos.z);
  mazeVisualGroup.add(hole);

  scene.add(mazeVisualGroup);
}

let canonicalAgent = null;

function loadPeterParker(callback){
  try {
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setResourcePath(OBJPATH);
    mtlLoader.setPath(OBJPATH);
    mtlLoader.load(MTLNAME, function(materials){
      materials.preload();
      const objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(OBJPATH);
      objLoader.load(OBJNAME, function(object){
        canonicalAgent = object;
        callback();
      }, undefined, function(){
        canonicalAgent = new THREE.Mesh(
          new THREE.BoxGeometry(60,120,60),
          new THREE.MeshStandardMaterial({color:0x1565c0})
        );
        callback();
      });
    }, undefined, function(){
      canonicalAgent = new THREE.Mesh(
        new THREE.BoxGeometry(60,120,60),
        new THREE.MeshStandardMaterial({color:0x1565c0})
      );
      callback();
    });
  } catch(e){
    canonicalAgent = new THREE.Mesh(
      new THREE.BoxGeometry(60,120,60),
      new THREE.MeshStandardMaterial({color:0x1565c0})
    );
    callback();
  }
}


function tryParseCommandsFromText(text){
  if (!text) return [];
  text = text.trim();
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj.commands)) {
      return obj.commands.map(c => String(c).toUpperCase());
    }
  } catch(e) {
  }

  try {
    const m = text.match(/\{[\s\S]*?"commands"\s*:\s*\[[\s\S]*?\]\s*\}/);
    if (m) {
      const o = JSON.parse(m[0]);
      if (Array.isArray(o.commands)) {
        return o.commands.map(c => String(c).toUpperCase());
      }
    }
  } catch(e2) {
    
  }

  
  const cmds = [];
  const re = /\b(FORWARD|LEFT|RIGHT)\b/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    cmds.push(match[1].toUpperCase());
  }

  return cmds;
}


async function callGemini(promptText, apiKey, label){
  const systemPrompt = `
Return ONLY {"commands":[...]}.
Allowed: FORWARD, LEFT, RIGHT.
Agent starts EAST.
No prose.
You are: ${label}.
`.trim();

  const fullPrompt = `SYSTEM:\n${systemPrompt}\n\nUSER:\n${promptText}`;

  const payload = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return tryParseCommandsFromText(text);
  } catch(e){
    console.warn("Gemini error:", e);
    return [];
  }
}


async function callHuggingFace(promptText, apiKey, label){
  const systemPrompt = `
Return ONLY {"commands":["FORWARD","LEFT","RIGHT"]}.
Agent starts EAST.
NO explanation.
You are ${label}.
`.trim();

  const body = {
    model: HF_MODEL,
    messages: [
      { role:"system", content: systemPrompt },
      { role:"user", content: promptText }
    ],
    temperature: 0.0,
    max_tokens: 200
  };

  try {
    const res = await fetch(HF_CHAT_URL, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    return tryParseCommandsFromText(text);
  } catch(e){
    console.warn("Hugging Face error:", e);
    return [];
  }
}


async function animateMoveTo(mesh, pos, ms=200){
  mesh.position.copy(pos);
  await sleep(ms);
}
async function animateRotate(mesh, dy, ms=150){
  mesh.rotation.y += dy;
  await sleep(ms);
}
async function bump(mesh){
  const oy=mesh.position.y;
  mesh.position.y = oy+20;
  await sleep(140);
  mesh.position.y = oy;
  await sleep(80);
}

async function runSingleCommandFor(mesh, state, cmd){
  const DIRS=[[ -1,0 ],[0,1],[1,0],[0,-1]];
  const C = (cmd||"").toUpperCase();

  if (C==="LEFT"){
    state.dir=(state.dir+3)%4;
    await animateRotate(mesh, Math.PI/2);
    return {valid:1};
  }
  if (C==="RIGHT"){
    state.dir=(state.dir+1)%4;
    await animateRotate(mesh, -Math.PI/2);
    return {valid:1};
  }
  if (C==="FORWARD"){
    const d=DIRS[state.dir];
    const nr=state.r+d[0], nc=state.c+d[1];
    if (canMoveTo(nr,nc)){
      state.r=nr; state.c=nc;
      await animateMoveTo(mesh, gridToWorld(nr,nc), 200);
      return {valid:1};
    }
    await bump(mesh);
    return {valid:0};
  }
  return {valid:0};
}


let agentA=null, agentB=null;
let agentState={ A:{}, B:{} };


let stats = {
  A: { valid: 0, total: 0 },
  B: { valid: 0, total: 0 }
};

function spawnAgents(scene){
  if (!canonicalAgent) return;

  if (agentA) scene.remove(agentA);
  if (agentB) scene.remove(agentB);

  agentA = canonicalAgent.clone(true);
  agentB = canonicalAgent.clone(true);

  agentA.scale.multiplyScalar(SCALE_HERO*0.8);
  agentB.scale.multiplyScalar(SCALE_HERO*0.8);

  agentA.traverse(c=>{ if(c.isMesh) c.material.color.set(0x1565c0); });
  agentB.traverse(c=>{ if(c.isMesh) c.material.color.set(0xc62828); });

  agentState.A={ r:START.r,c:START.c,dir:1 };
  agentState.B={ r:START.r,c:START.c,dir:1 };

  const base = gridToWorld(START.r, START.c);
  const off = TILE_SIZE*0.18;

  const pA = base.clone(); pA.x -= off;
  const pB = base.clone(); pB.x += off;

  agentA.position.copy(pA);
  agentB.position.copy(pB);

  agentA.rotation.y=0;
  agentB.rotation.y=0;

  ABWorld.scene.add(agentA);
  ABWorld.scene.add(agentB);
}

async function runFromUI(){
  clearLogUI();
  logUI("Running…");

  
  stats = {
    A: { valid: 0, total: 0 },
    B: { valid: 0, total: 0 }
  };

  if (!MAZE.length){
    logUI("Load a maze first.");
    return;
  }

  const instruction = 
    (document.getElementById("mb_instruction")?.value || "Go to the red hole").trim();

  const prompt = `
MAZE:
${JSON.stringify({rows:ROWS, cols:COLS, maze:MAZE, start:START, end:TARGET})}

INSTRUCTION:
"${instruction}"

Return ONLY {"commands":[...]}.
`.trim();

  const gemKey = 
    (document.getElementById("mb_gem")?.value || "").trim() 
    || DEFAULT_GEMINI_API_KEY;

  const hfKey =
    (document.getElementById("mb_hf")?.value || "").trim()
    || DEFAULT_HF_API_KEY;

  logUI("Calling Gemini + Hugging Face…");

  const cmdsA = await callGemini(prompt, gemKey, "Gemini");
  const cmdsB = await callHuggingFace(prompt, hfKey, "HuggingFace");

  logUI("Gemini → " + JSON.stringify(cmdsA));
  logUI("HuggingFace → " + JSON.stringify(cmdsB));

  const maxLen = Math.max(cmdsA.length, cmdsB.length);

  for (let i=0;i<maxLen;i++){
    const tasks = [];

    if (i < cmdsA.length) {
      tasks.push(
        runSingleCommandFor(agentA, agentState.A, cmdsA[i]).then(res => {
          stats.A.total++;
          if (res && res.valid) stats.A.valid++;
        })
      );
    }

    if (i < cmdsB.length) {
      tasks.push(
        runSingleCommandFor(agentB, agentState.B, cmdsB[i]).then(res => {
          stats.B.total++;
          if (res && res.valid) stats.B.valid++;
        })
      );
    }

    await Promise.all(tasks);
    await sleep(150);
  }

  const A_end = agentState.A.r===TARGET.r && agentState.A.c===TARGET.c;
  const B_end = agentState.B.r===TARGET.r && agentState.B.c===TARGET.c;

  if (A_end && !B_end) logUI("Winner: Gemini");
  else if (B_end && !A_end) logUI("Winner: Hugging Face");
  else if (A_end && B_end) logUI("Tie!");
  else logUI("None reached the goal.");

  const accA = stats.A.total ? Math.round((stats.A.valid / stats.A.total) * 100) : 0;
  const accB = stats.B.total ? Math.round((stats.B.valid / stats.B.total) * 100) : 0;

  logUI("");
  logUI(`Gemini accuracy: ${accA}% (${stats.A.valid}/${stats.A.total} valid moves)`);
  logUI(`Hugging Face accuracy: ${accB}% (${stats.B.valid}/${stats.B.total} valid moves)`);
}


let controlDiv=null;

function createSimpleUI(){
  if (controlDiv) controlDiv.remove();

  controlDiv=document.createElement("div");
  controlDiv.style.position="absolute";
  controlDiv.style.left="16px";
  controlDiv.style.top="16px";
  controlDiv.style.zIndex=9999;
  controlDiv.style.width="360px";
  controlDiv.style.padding="14px";
  controlDiv.style.background="rgba(255,255,255,0.95)";
  controlDiv.style.borderRadius="10px";

  controlDiv.innerHTML=`
    <h3>Gemini vs Hugging Face</h3>

    <label>Maze Size:</label>
    <select id="mb_maze_size" class="ui-input">
      <option value="10">10x10</option>
      <option value="15">15x15</option>
      <option value="20">20x20</option>
    </select>

    <label style="margin-top:8px;">Preset:</label>
    <select id="mb_maze_preset" class="ui-input">
      <option>1</option><option>2</option><option>3</option>
    </select>

    <button id="mb_load" class="ui-btn-primary" style="margin-top:10px;">Load Maze</button>

    <label style="margin-top:10px;">Instruction:</label>
    <input id="mb_instruction" class="ui-input" placeholder="Go to the red hole">

    <label style="margin-top:10px;">Gemini Key:</label>
    <input id="mb_gem" class="ui-input" placeholder="Default used">

    <label style="margin-top:10px;">Hugging Face Key:</label>
    <input id="mb_hf" class="ui-input" placeholder="Default used">

    <div style="display:flex;gap:8px;margin-top:10px;">
      <button id="mb_run" class="ui-btn-secondary">Run</button>
      <button id="mb_mock" class="ui-btn-secondary">Mock</button>
    </div>

    <button id="mb_reset" class="ui-btn-danger" style="margin-top:10px;">Reset</button>

    <div id="mb_log" style="margin-top:10px; background:#fafafa; height:160px; border-radius:8px; padding:10px; overflow:auto; border:1px solid #ddd; font-size:13px;">Ready.</div>
  `;

  document.body.appendChild(controlDiv);

  document.getElementById("mb_load").onclick = function(){
    const size = parseInt(document.getElementById("mb_maze_size").value,10);
    const preset = parseInt(document.getElementById("mb_maze_preset").value,10);
    const d = PRESETS[size][preset-1];
    if (!d){ logUI("Invalid preset"); return; }

    setMazeFromData(d.maze, d.start, d.end);
    buildMazeVisuals(ABWorld.scene);
    spawnAgents(ABWorld.scene);
    ABWorld.render();
  };

  document.getElementById("mb_run").onclick = () => runFromUI();
  document.getElementById("mb_mock").onclick = () => {
    logUI("Mock results:");
    logUI("Gemini → [\"FORWARD\",\"RIGHT\"]");
    logUI("HuggingFace → [\"FORWARD\",\"LEFT\"]");
  };
  document.getElementById("mb_reset").onclick = () => location.reload();

  const style=document.createElement("style");
  style.innerHTML=`
    .ui-input{
      width:100%; padding:8px; margin-top:6px; border-radius:6px; border:1px solid #ccc;
    }
    .ui-btn-primary{
      width:100%; padding:10px; background:#0078ff; color:#fff; border:none; border-radius:6px;
    }
    .ui-btn-secondary{
      flex:1; padding:10px; background:#444; color:#fff; border:none; border-radius:6px;
    }
    .ui-btn-danger{
      width:100%; padding:10px; background:#d62828; color:#fff; border:none; border-radius:6px;
    }
  `;
  document.head.appendChild(style);
}

function logUI(s){
  const el=document.getElementById("mb_log");
  if(!el) return;
  el.innerText += "\n"+s;
  el.scrollTop = el.scrollHeight;
}
function clearLogUI(){
  const el=document.getElementById("mb_log");
  if(el) el.innerText="";
}


AB.world.newRun = function(){
  AB.loadingScreen();
  AB.runReady = false;

  const def = PRESETS[10][0];
  setMazeFromData(def.maze, def.start, def.end);

  ABWorld.init3d(3000,30000,0xcfe6ff);

  ABWorld.scene.add(new THREE.AmbientLight(0x666666));
  const dl=new THREE.DirectionalLight(0xffffff,1.0);
  dl.position.set(1000,2000,1000);
  ABWorld.scene.add(dl);

  buildMazeVisuals(ABWorld.scene);

  loadPeterParker(function(){
    spawnAgents(ABWorld.scene);
    createSimpleUI();
    AB.removeLoading();
    AB.runReady = true;
    ABWorld.render();
  });

  try {
    const tex = new THREE.CubeTextureLoader().load(SKYBOX_ARRAY);
    ABWorld.scene.background = tex;
  } catch(e){}
};

AB.world.nextStep = function(){};
