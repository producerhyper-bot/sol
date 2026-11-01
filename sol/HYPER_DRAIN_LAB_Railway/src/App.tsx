import { useState } from "react";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Activity, AlertTriangle, CheckCircle2, Copy, Shield, Wallet } from "lucide-react";

type Network = "devnet" | "mainnet-beta";
type Phantom = { isPhantom?: boolean; connect: () => Promise<{publicKey: PublicKey}>; disconnect: () => Promise<void> };
declare global { interface Window { solana?: Phantom } }

const MAIN_WALLET = "HQ7Fp1W1AjkBF5j6pQMKHfTPRUZxqVr72cPNs5cYDz3D";

export default function App() {
  const [network,setNetwork] = useState<Network>("devnet");
  const [wallet,setWallet] = useState("");
  const [balance,setBalance] = useState<number|null>(null);
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState("Connect Phantom to inspect your public wallet information.");
  const [logs,setLogs] = useState(["HYPER DRAIN LAB initialized.","Read-only monitoring enabled.","No transaction signing or asset transfers are available."]);
  const log = (s:string) => setLogs(old => [`${new Date().toLocaleTimeString()} — ${s}`,...old].slice(0,30));
  const rpc = () => new Connection(clusterApiUrl(network),"confirmed");

  async function connect() {
    if (!window.solana?.isPhantom) { setStatus("Phantom was not detected. Install the official Phantom extension."); return; }
    try {
      setBusy(true);
      const result = await window.solana.connect();
      const address = result.publicKey.toBase58();
      setWallet(address);
      const lamports = await rpc().getBalance(result.publicKey);
      setBalance(lamports/LAMPORTS_PER_SOL);
      setStatus("Connected. Public wallet balance loaded.");
      log(`Connected ${address}; read balance on ${network}.`);
    } catch(e) { const m=e instanceof Error?e.message:"Connection failed."; setStatus(m); log(m); }
    finally { setBusy(false); }
  }

  async function refresh() {
    if (!wallet) return;
    try {
      setBusy(true);
      const value = await rpc().getBalance(new PublicKey(wallet));
      setBalance(value/LAMPORTS_PER_SOL);
      setStatus("Balance refreshed.");
      log(`Balance refreshed on ${network}.`);
    } catch(e) { const m=e instanceof Error?e.message:"Balance lookup failed."; setStatus(m); log(m); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    try { await window.solana?.disconnect(); } finally {
      setWallet(""); setBalance(null); setStatus("Wallet disconnected."); log("Wallet disconnected.");
    }
  }

  async function copyMain() {
    try { await navigator.clipboard.writeText(MAIN_WALLET); setStatus("Main wallet address copied."); log("Copied receiving address."); }
    catch { setStatus("Clipboard unavailable. Copy the displayed address manually."); }
  }

  return <main className="shell">
    <header className="topbar">
      <div><div className="brand">HYPER <span>DRAIN LAB</span></div><div className="tagline">SOLANA WALLET SECURITY • EDUCATION DASHBOARD</div></div>
      <label className="network">NETWORK<select value={network} onChange={e=>setNetwork(e.target.value as Network)}><option value="devnet">Devnet</option><option value="mainnet-beta">Mainnet</option></select></label>
    </header>

    <div className="notice"><AlertTriangle/><div><b>READ-ONLY BUILD</b><br/>This site can connect to Phantom to read your public address and SOL balance. It cannot request signatures, transfer funds, or move assets to another wallet.</div></div>

    <section className="hero"><div><div className="eyebrow">WALLET OVERVIEW</div><h1>Monitor your<br/><span>Solana wallet.</span></h1><p>Inspect public wallet information and learn how to identify risky transaction requests.</p></div><div className="heroicon"><Shield size={55}/></div></section>

    <section className="cards">
      <article className="card">
        <div className="cardhead"><span><Wallet/> CONNECTED WALLET</span><i>{wallet?"CONNECTED":"DISCONNECTED"}</i></div>
        <div className="address">{wallet?`${wallet.slice(0,7)}…${wallet.slice(-7)}`:"Not connected"}</div>
        <div className="muted">{wallet||"Connect Phantom to begin."}</div>
        <div className="label">PUBLIC SOL BALANCE</div><div className="balance">{balance===null?"—":balance.toFixed(5)} <small>SOL</small></div>
        {!wallet?<button className="primary" disabled={busy} onClick={connect}>{busy?"CONNECTING…":"CONNECT PHANTOM"}</button>:<div className="buttons"><button className="primary" disabled={busy} onClick={refresh}>{busy?"CHECKING…":"REFRESH BALANCE"}</button><button onClick={disconnect}>DISCONNECT</button></div>}
      </article>

      <article className="card">
        <div className="cardhead"><span>MAIN RECEIVING WALLET</span><i>PUBLIC ADDRESS</i></div>
        <div className="receive">{MAIN_WALLET}</div>
        <button onClick={copyMain}><Copy size={15}/> COPY ADDRESS</button>
        <p className="muted"><CheckCircle2 className="inline"/> Displayed for reference only. No transfer is initiated.</p>
      </article>
    </section>

    <section className="card section">
      <div className="cardhead"><span><Shield/> SECURITY CHECKLIST</span><i>DEFENSIVE MODE</i></div>
      <div className="checks">
        <div><CheckCircle2/><b>Verify destination<small>Compare the full address, not only the first and last characters.</small></b></div>
        <div><CheckCircle2/><b>Inspect instructions<small>Be cautious with unknown programs and unexpected token approvals.</small></b></div>
        <div><CheckCircle2/><b>Understand fees<small>Keep enough SOL for network fees and verify the selected network.</small></b></div>
      </div>
    </section>

    <section className="card section">
      <div className="cardhead"><span><Activity/> ACTIVITY LOG</span><i>LOCAL SESSION</i></div>
      <p className="status">{status}</p><div className="log">{logs.map((x,i)=><div key={i}>{x}</div>)}</div>
    </section>
    <footer>HYPER DRAIN LAB · EDUCATIONAL SECURITY TOOL</footer>
  </main>;
}
