const PHONE = "18650258338"; // 只留电话，其他全走环境变量

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // 页面
  if (request.method === "GET") {
    return new Response(getHtml(), {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  // 发送接口（后端处理，不暴露任何密钥）
  if (request.method === "POST" && url.pathname === "/api/send") {
    try {
      const { carNo, userCode, code } = await request.json();

      if (code !== userCode) {
        return Response.json({ success: false, msg: "验证码错误" });
      }

      // 从 Cloudflare 环境变量读取
      const WX_TOKEN = WX_TOKEN_ENV;
      const WX_UID = WX_UID_ENV;

      const res = await fetch("https://wxpusher.zjiecode.com/api/send/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appToken: WX_TOKEN,
          content: `车牌号 ${carNo} 车主，请挪车`,
          uids: [WX_UID],
        }),
      });

      const data = await res.json();
      return Response.json(data);
    } catch (e) {
      return Response.json({ success: false, msg: "发送失败" });
    }
  }

  return new Response("Not found", { status: 404 });
}

function getHtml() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>挪车通知</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f2f5fa;padding:20px;font-family:-apple-system,BlinkMacSystemFont,Roboto,sans-serif}
.container{max-width:380px;margin:50px auto}
.card{background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,0.08);padding:32px 24px}
.qr-box{width:120px;height:120px;margin:0 auto 20px;background:#f8f9fa;border-radius:12px;
background:url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeD0iMTAiIHk9IjEwIiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgeD0iMjAiIHk9IjIwIiBmaWxsOiMzMzMiLz48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHg9IjgwIiB5PSIyMCIgZmlsbD0iIzMzMyIvPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgeD0iMjAiIHk9IjgwIiBmaWxsOiMzMzMiLz48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHg9IjQwIiB5PSI0MCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==') center/100% no-repeat}
.title{text-align:center;font-size:22px;font-weight:700;color:#222;margin-bottom:6px}
.subtitle{text-align:center;font-size:14px;color:#666;margin-bottom:28px}
.form-item{margin-bottom:16px}
.form-item label{display:block;font-size:14px;color:#333;margin-bottom:6px;font-weight:500}
.form-item input{width:100%;height:48px;border:1px solid #e1e4e8;border-radius:12px;padding:0 16px;font-size:16px;outline:none}
.code-row{display:flex;gap:12px}
#codeCanvas{width:120px;height:48px;border-radius:12px;background:#f5f7fa;cursor:pointer}
.btn{width:100%;height:52px;border-radius:14px;font-size:16px;font-weight:600;border:none;margin-bottom:12px}
.btn-call{background:#007AFF;color:#fff}
.btn-notify{background:#34C759;color:#fff}
.tip{text-align:center;font-size:12px;color:#999;margin-top:16px}
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <div class="qr-box"></div>
    <div class="title">临时挪车通知</div>
    <div class="subtitle">扫码联系车主，保护隐私</div>
    <div class="form-item">
      <label>车牌号</label>
      <input type="text" id="carNo" placeholder="如：京A12345">
    </div>
    <div class="form-item">
      <label>验证码</label>
      <div class="code-row">
        <input type="text" id="codeInput" maxlength="4">
        <canvas id="codeCanvas"></canvas>
      </div>
    </div>
    <button class="btn btn-call" onclick="call()">一键拨打车主电话</button>
    <button class="btn btn-notify" onclick="sendNotify()">微信通知车主挪车</button>
    <div class="tip">仅用于挪车</div>
  </div>
</div>
<script>
let validateCode = "";
function genCode(){
  const c = "0123456789ABCDEFGHJKLMNPQRSTWXYZ";
  validateCode = Array(4).fill().map(()=>c[Math.floor(Math.random()*c.length)]).join('');
  const e = document.getElementById("codeCanvas"),x = e.getContext("2d");
  e.width=240;e.height=96;x.scale(2,2);
  x.fillStyle="#f5f7fa";x.fillRect(0,0,120,48);
  x.font="bold 24px Arial";x.fillStyle="#007AFF";
  x.textAlign="center";x.textBaseline="middle";
  x.fillText(validateCode,60,24);
}
function call(){location.href='tel:${PHONE}'}
async function sendNotify(){
  const carNo = document.getElementById('carNo').value.trim();
  const userCode = document.getElementById('codeInput').value.trim().toUpperCase();
  if(!carNo){alert('请输入车牌号');return}
  if(!userCode){alert('请输入验证码');return}
  try{
    const r = await fetch('/api/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({carNo, userCode, code:validateCode})
    });
    const d=await r.json();
    alert(d.success ? '发送成功！已通知车主' : '发送失败：'+d.msg);
  }catch(e){alert('发送失败，请电话联系')}
  genCode();
}
window.onload=()=>{genCode();document.getElementById('codeCanvas').onclick=genCode}
</script>
</body>
</html>
  `;
}
