const ITEMS = [
  {local:"PSA CR", categoria:"Sistema Smart", equipamento:"HRG-032402"},
  {local:"PSA CR", categoria:"Sistema Smart", equipamento:"HRG-027971"},
  {local:"PSA Recepção", categoria:"Sistema Smart + Impressora", equipamento:"Todas as Máquinas e Impressoras"},
  {local:"PSA Consultório 1", categoria:"Sistema Smart + Impressora", equipamento:"HRG-031085"},
  {local:"PSA Consultório 2", categoria:"Sistema Smart + Impressora", equipamento:"HRG-042895"},
  {local:"PSA Consultório 3", categoria:"Sistema Smart + Impressora", equipamento:"HRG-028321"},
  {local:"PSA Consultório 4", categoria:"Sistema Smart + Impressora", equipamento:"HRG-030479"},
  {local:"PSA Consultório 5", categoria:"Sistema Smart + Impressora", equipamento:"HRG-002412"},
  {local:"Pronto Socorro Adulto - Recepção", categoria:"Painel de Chamada, Escala Médica e Tempo de Espera", equipamento:"10.1.3.60"},
  {local:"Pronto Socorro Adulto - Recepção", categoria:"Totem de Emissão de Senha", equipamento:"10.1.5.117"},
  {local:"Pronto Socorro – Estar Médico", categoria:"Painel de Espera", equipamento:"10.1.4.200"},
  {local:"Pronto Socorro Infantil - Recepção", categoria:"Painel de Chamada, Tempo de Espera e Escala Médica", equipamento:"HRG-027813"},
  {local:"Pronto Socorro Infantil - Recepção", categoria:"Totem de Emissão de Senha", equipamento:"10.1.3.59"},
  {local:"Pronto Socorro Obstétrico - Recepção", categoria:"Painel de Chamada e Escala Médica", equipamento:"HRG-027830"},
  {local:"Oncologia", categoria:"Totem de Emissão de Senha e Painel de Chamada", equipamento:"totemadmealta"}
];

let currentPdfBlob = null;
let currentPdfUrl = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("data").value = new Date().toISOString().slice(0,10);
  renderItems();
  updateProgress();
  registerSW();
  setTimeout(reenviarPendentesDrive,1500);
});

function renderItems(){
  const root = document.getElementById("items");
  root.innerHTML = ITEMS.map((item,i)=>`
    <article class="item" data-index="${i}">
      <div class="item-head">
        <div class="number">${i+1}</div>
        <div>
          <div class="item-title">${escapeHtml(item.local)}</div>
          <div class="item-meta">${escapeHtml(item.categoria)} · <strong>${escapeHtml(item.equipamento)}</strong></div>
        </div>
      </div>
      <div class="choice">
        <div>
          <input type="radio" id="yes${i}" name="check${i}" value="SIM" onchange="updateProgress()">
          <label for="yes${i}">✓ SIM</label>
        </div>
        <div>
          <input type="radio" id="no${i}" name="check${i}" value="NÃO" onchange="updateProgress()">
          <label for="no${i}">✕ NÃO</label>
        </div>
      </div>
      <textarea id="obs${i}" placeholder="Observações do item ${i+1}"></textarea>
    </article>`).join("");
}

function getFormData(){
  return {
    nome: document.getElementById("nome").value.trim(),
    matricula: document.getElementById("matricula").value.trim(),
    data: document.getElementById("data").value,
    assinatura: document.getElementById("assinatura").value.trim(),
    items: ITEMS.map((item,i)=>({
      ...item,
      check: document.querySelector(`input[name="check${i}"]:checked`)?.value || "",
      obs: document.getElementById(`obs${i}`).value.trim()
    }))
  };
}

function updateProgress(){
  let done = 0;
  ITEMS.forEach((_,i)=>{if(document.querySelector(`input[name="check${i}"]:checked`)) done++});
  document.getElementById("progressText").textContent = `${done} / ${ITEMS.length}`;
  document.getElementById("progressBar").style.width = `${done/ITEMS.length*100}%`;
}

document.getElementById("checklistForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const data = getFormData();
  if(!data.nome || !data.matricula || !data.data){alert("Preencha responsável, matrícula e data."); return;}
  const missing = data.items.findIndex(x=>!x.check);
  if(missing >= 0){
    if(!confirm(`O item ${missing+1} está sem SIM/NÃO. Deseja finalizar mesmo assim?`)) return;
  }
  saveHistory(data);
  try{
    currentPdfBlob = await createPDF(data);
    if(currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = URL.createObjectURL(currentPdfBlob);
    document.getElementById("viewPdf").onclick = ()=>window.open(currentPdfUrl,"_blank");
    document.getElementById("downloadPdf").onclick = ()=>downloadBlob(currentPdfBlob, pdfName(data));
    document.getElementById("sharePdf").onclick = ()=>sharePDF(data);
    showScreen("result");

    if(typeof GOOGLE_DRIVE_WEBAPP_URL === "undefined" ||
       !GOOGLE_DRIVE_WEBAPP_URL.trim()){
      setDriveStatus(
        "⚠ Google Drive ainda não foi configurado.",
        "warning"
      );
    }else{
      setDriveStatus(
        "Enviando PDF para o Google Drive...",
        "loading"
      );

      const envio = await uploadPdfToDrive(currentPdfBlob,data);

      if(envio.ok){
        setDriveStatus(
          `✓ Enviado para o Google Drive: ${pdfName(data)}`,
          "success"
        );
      }else{
        await guardarNaFilaDrive(currentPdfBlob,data);
        setDriveStatus(
          "⚠ PDF gerado. O envio ficou pendente e será tentado novamente quando houver conexão.",
          "warning"
        );
      }
    }
  }catch(err){
    console.error(err);
    alert("Não foi possível gerar o PDF. Verifique se o dispositivo está conectado à internet na primeira utilização.");
  }
});

async function createPDF(data){
  if(!window.jspdf) throw new Error("jsPDF não carregado");
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const logo = await imageToDataURL("assets/logo.png");
  const W = 210, H = 297, margin = 14;
  let y = 13;

  function header(){
    if(logo) doc.addImage(logo,"PNG",margin,y,47,20);
    doc.setTextColor(20,20,20);
    doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text("CHECKLIST SMART",W-margin,y+8);
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text("ÁREAS DE EMERGÊNCIA · CLT.QUA.005 · ANEXO 1",W-margin,y+14,{align:"right"});
    y += 27;
    doc.setDrawColor(40,40,40); doc.line(margin,y,W-margin,y); y += 7;
  }
  function ensure(h=10){
    if(y+h > H-15){doc.addPage(); y=13; header();}
  }
  function field(label,value){
    ensure(8); doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(70,70,70);
    doc.text(label.toUpperCase(),margin,y);
    doc.setFont("helvetica","normal"); doc.setTextColor(20,20,20);
    doc.text(String(value||"-"),margin+29,y); y+=6;
  }
  header();
  field("Responsável",data.nome);
  field("Mat. do responsável",data.matricula);
  field("Data",formatDate(data.data));
  y += 2;

  data.items.forEach((item,i)=>{
    const text = `${i+1}. ${item.local} — ${item.categoria} — ${item.equipamento}`;
    const lines = doc.splitTextToSize(text,W-2*margin-4);
    const obs = item.obs ? doc.splitTextToSize("Obs.: "+item.obs,W-2*margin-4) : [];
    const h = 11 + lines.length*4 + (obs.length ? obs.length*4+4 : 0);
    ensure(h);
    doc.setFillColor(242,242,242); doc.roundedRect(margin,y,W-2*margin,h-2,2,2,"F");
    doc.setTextColor(20,20,20); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text(lines,margin+3,y+5);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    const status = item.check || "NÃO INFORMADO";
    doc.text(`Conformidade: ${status}`,W-margin-3,y+5,{align:"right"});
    let yy=y+5+lines.length*4;
    if(obs.length){doc.setTextColor(75,75,75);doc.text(obs,margin+3,yy+3);yy+=obs.length*4+2;}
    y += h+3;
  });

  ensure(16); y += 3;
  doc.setDrawColor(70,70,70); doc.line(margin,y,W-margin,y); y+=7;
  doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(50,50,50);
  doc.text("ASSINATURA / IDENTIFICAÇÃO",margin,y);
  doc.setFont("helvetica","normal"); doc.text(data.assinatura || data.nome,margin,y+6);
  doc.setFontSize(7); doc.setTextColor(110,110,110);
  doc.text("Hospital Rio Grande · DTI - Tecnologia da Informação",W/2,H-8,{align:"center"});
  return doc.output("blob");
}

async function sharePDF(data){
  if(!currentPdfBlob) return;
  const file = new File([currentPdfBlob],pdfName(data),{type:"application/pdf"});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    try{await navigator.share({title:"Checklist SMART",text:"Checklist SMART - Áreas de Emergência",files:[file]});return;}
    catch(e){if(e.name==="AbortError")return;}
  }
  downloadBlob(currentPdfBlob,pdfName(data));
  alert("O compartilhamento nativo não está disponível neste navegador. O PDF foi baixado para você compartilhar manualmente.");
}


function setDriveStatus(mensagem, tipo="neutral"){
  const elemento = document.getElementById("driveStatus");
  if(!elemento) return;
  elemento.textContent = mensagem;
  elemento.className = `drive-status ${tipo}`;
}

function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onloadend = ()=>{
      const resultado = String(reader.result);
      resolve(resultado.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadPdfToDrive(blob, data){
  if(typeof GOOGLE_DRIVE_WEBAPP_URL === "undefined" ||
     !GOOGLE_DRIVE_WEBAPP_URL.trim()){
    return {ok:false, motivo:"nao-configurado"};
  }

  const payload = {
    filename: pdfName(data),
    mimeType: "application/pdf",
    data: await blobToBase64(blob),
    metadata: {
      nome: data.nome || "",
      matricula: data.matricula || "",
      data: data.data || ""
    }
  };

  try{
    // text/plain evita preflight CORS no Web App do Google Apps Script.
    // O modo no-cors não permite ler a resposta, então aqui confirmamos
    // somente que o envio foi aceito pelo navegador; falhas de rede entram na fila.
    await fetch(GOOGLE_DRIVE_WEBAPP_URL,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload)
    });
    return {ok:true};
  }catch(erro){
    console.error("Erro ao enviar para o Google Drive:",erro);
    return {ok:false,motivo:"rede"};
  }
}

async function guardarNaFilaDrive(blob,data){
  try{
    const base64 = await blobToBase64(blob);
    const fila = JSON.parse(
      localStorage.getItem("checklists-drive-pending") || "[]"
    );

    fila.push({
      id:Date.now(),
      filename:pdfName(data),
      data:base64,
      metadata:{
        nome:data.nome || "",
        matricula:data.matricula || "",
        data:data.data || ""
      }
    });

    localStorage.setItem(
      "checklists-drive-pending",
      JSON.stringify(fila.slice(-10))
    );
  }catch(erro){
    console.error("Não foi possível guardar o PDF na fila:",erro);
  }
}

async function reenviarPendentesDrive(){
  if(!navigator.onLine ||
     typeof GOOGLE_DRIVE_WEBAPP_URL === "undefined" ||
     !GOOGLE_DRIVE_WEBAPP_URL.trim()){
    return;
  }

  const fila = JSON.parse(
    localStorage.getItem("checklists-drive-pending") || "[]"
  );

  if(!fila.length) return;

  const restantes=[];

  for(const item of fila){
    try{
      await fetch(GOOGLE_DRIVE_WEBAPP_URL,{
        method:"POST",
        mode:"no-cors",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({
          filename:item.filename,
          mimeType:"application/pdf",
          data:item.data,
          metadata:item.metadata
        })
      });
    }catch(erro){
      restantes.push(item);
    }
  }

  localStorage.setItem(
    "checklists-drive-pending",
    JSON.stringify(restantes)
  );
}

window.addEventListener("online",()=>{
  reenviarPendentesDrive();
});

function saveHistory(data){
  const list = JSON.parse(localStorage.getItem("checklists-smart")||"[]");
  list.unshift({id:Date.now(),...data});
  localStorage.setItem("checklists-smart",JSON.stringify(list.slice(0,50)));
}
function renderHistory(){
  const list = JSON.parse(localStorage.getItem("checklists-smart")||"[]");
  const root = document.getElementById("historyList");
  if(!list.length){root.innerHTML='<div class="history-empty">Nenhum checklist realizado neste dispositivo.</div>';return;}
  root.innerHTML=list.map(x=>`
    <div class="history-card">
      <div><h3>${escapeHtml(x.nome)}</h3><p>${formatDate(x.data)} · Matrícula ${escapeHtml(x.matricula)} · ${x.items.filter(i=>i.check==="SIM").length}/${x.items.length} SIM</p></div>
      <div class="mini-actions"><button class="mini-btn" onclick="historyPdf(${x.id})">PDF</button><button class="mini-btn" onclick="deleteHistory(${x.id})">Excluir</button></div>
    </div>`).join("");
}
async function historyPdf(id){
  const list=JSON.parse(localStorage.getItem("checklists-smart")||"[]");
  const data=list.find(x=>x.id===id); if(!data)return;
  currentPdfBlob=await createPDF(data); currentPdfUrl=URL.createObjectURL(currentPdfBlob);
  document.getElementById("viewPdf").onclick=()=>window.open(currentPdfUrl,"_blank");
  document.getElementById("downloadPdf").onclick=()=>downloadBlob(currentPdfBlob,pdfName(data));
  document.getElementById("sharePdf").onclick=()=>sharePDF(data);
  showScreen("result");
}
function deleteHistory(id){if(confirm("Excluir este registro deste dispositivo?")){const l=JSON.parse(localStorage.getItem("checklists-smart")||"[]").filter(x=>x.id!==id);localStorage.setItem("checklists-smart",JSON.stringify(l));renderHistory();}}
function resetChecklist(){document.getElementById("checklistForm").reset();document.getElementById("data").value=new Date().toISOString().slice(0,10);updateProgress();showScreen("form");window.scrollTo(0,0);}
function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));document.getElementById(id).classList.add("active");window.scrollTo(0,0);}
function confirmHome(){if(confirm("Sair do checklist? Os dados não finalizados serão perdidos."))showScreen("home")}
function formatDate(s){if(!s)return"-";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`;}
function pdfName(d){
  const data = d && d.data ? d.data : "";
  const partes = data.split("-");
  const dataFormatada = partes.length === 3
    ? `${partes[2]}-${partes[1]}-${partes[0]}`
    : "sem-data";
  return `Checklist - ${dataFormatada}.pdf`;
}
function slug(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_|_$/g,"");}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function imageToDataURL(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);resolve(c.toDataURL("image/png"));};img.onerror=reject;img.src=src;});}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
async function registerSW(){if("serviceWorker" in navigator){try{await navigator.serviceWorker.register("sw.js");}catch(e){console.warn("SW:",e)}}}
