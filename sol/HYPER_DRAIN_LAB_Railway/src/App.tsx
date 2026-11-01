
import { useState } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signAndSendTransaction: (
        transaction: Transaction
      ) => Promise<{ signature: string }>;
    };
  }
}

const MAIN_WALLET =
  "HQ7Fp1W1AjkBF5j6pQMKHfTPRUZxqVr72cPNs5cYDz3D";

type Network = "devnet" | "mainnet-beta";

export default function App() {
  const [network, setNetwork] = useState<Network>("devnet");
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("0.01");
  const [showPayment, setShowPayment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Connect your Phantom wallet.");
  const [transactionUrl, setTransactionUrl] = useState("");

  const connection = new Connection(
    clusterApiUrl(network),
    "confirmed"
  );

  async function connectWallet() {
    if (!window.solana?.isPhantom) {
      setStatus("Please install the Phantom wallet extension.");
      return;
    }

    try {
      setBusy(true);

      const result = await window.solana.connect();
      const address = result.publicKey.toBase58();

      setWallet(address);

      const lamports = await connection.getBalance(
        result.publicKey
      );

      setBalance(lamports / LAMPORTS_PER_SOL);
      setStatus("Wallet connected successfully.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Connection failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshBalance() {
    if (!wallet) return;

    try {
      setBusy(true);

      const lamports = await connection.getBalance(
        new PublicKey(wallet)
      );

      setBalance(lamports / LAMPORTS_PER_SOL);
      setStatus("Balance updated.");
    } catch {
      setStatus("Unable to refresh balance.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPayment() {
    if (!wallet || !window.solana?.isPhantom) {
      setStatus("Connect Phantom first.");
      return;
    }

    const solAmount = Number(amount);

    if (!Number.isFinite(solAmount) || solAmount <= 0) {
      setStatus("Enter a valid SOL amount.");
      return;
    }

    if (balance !== null && solAmount >= balance) {
      setStatus("Insufficient balance. Leave enough SOL for network fees.");
      return;
    }

    const destination = new PublicKey(MAIN_WALLET);

    const approved = window.confirm(
      `PAYMENT CONFIRMATION\n\n` +
      `Amount: ${solAmount} SOL\n` +
      `Recipient: ${MAIN_WALLET}\n` +
      `Network: ${network}\n\n` +
      `This is a payment, not a claim or reward. ` +
      `Continue to Phantom to review and approve the transaction?`
    );

    if (!approved) {
      setStatus("Payment cancelled.");
      return;
    }

    try {
      setBusy(true);
      setTransactionUrl("");

      const sender = new PublicKey(wallet);

      const latest = await connection.getLatestBlockhash();

      const transaction = new Transaction({
        feePayer: sender,
        recentBlockhash: latest.blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: destination,
          lamports: Math.round(
            solAmount * LAMPORTS_PER_SOL
          ),
        })
      );

      setStatus("Review the transaction in Phantom.");

      const result =
        await window.solana.signAndSendTransaction(transaction);

      const confirmation = await connection.confirmTransaction(
        {
          signature: result.signature,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error("Transaction failed on the Solana network.");
      }

      const explorer =
        `https://explorer.solana.com/tx/${result.signature}` +
        (network === "devnet" ? "?cluster=devnet" : "");

      setTransactionUrl(explorer);
      setStatus(`Payment confirmed: ${solAmount} SOL.`);

      await refreshBalance();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Payment was not completed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWallet() {
    await window.solana?.disconnect();
    setWallet("");
    setBalance(null);
    setShowPayment(false);
    setStatus("Wallet disconnected.");
  }

  return (
    <main className="app">
      <header>
        <div className="brand">HYPER <span>DRAIN LAB</span></div>
        <p>SOLANA WALLET MONITOR</p>

        <label>
          NETWORK
          <select
            value={network}
            onChange={(event) => {
              setNetwork(event.target.value as Network);
              setBalance(null);
              setTransactionUrl("");
            }}
          >
            <option value="devnet">Devnet — Test SOL</option>
            <option value="mainnet-beta">Mainnet — Real SOL</option>
          </select>
        </label>
      </header>

      <section className="notice">
        <strong>TRANSPARENT PAYMENTS</strong>
        <p>
          Connecting your wallet only reads your public address
          and balance. Payments are optional and require your
          approval in Phantom. This is a payment, not a claim,
          airdrop, or reward.
        </p>
      </section>

      <section className="hero">
        <p>WALLET OVERVIEW</p>
        <h1>Monitor your <span>Solana wallet.</span></h1>
        <p>
          View your balance and make an optional payment
          when you choose.
        </p>
      </section>

      <section className="panel">
        <h2>YOUR WALLET</h2>

        {wallet ? (
          <>
            <p className="address">{wallet}</p>
            <h3>
              {balance === null ? "Loading..." : balance.toFixed(5)}
              {" "}SOL
            </h3>

            <button onClick={refreshBalance} disabled={busy}>
              REFRESH BALANCE
            </button>

            <button className="secondary" onClick={disconnectWallet}>
              DISCONNECT
            </button>
          </>
        ) : (
          <button onClick={connectWallet} disabled={busy}>
            {busy ? "CONNECTING..." : "CONNECT PHANTOM"}
          </button>
        )}
      </section>

      <section className="panel">
        <h2>PAYMENT RECIPIENT</h2>
        <p className="address">{MAIN_WALLET}</p>

        <button
          className="secondary"
          onClick={() =>
            navigator.clipboard.writeText(MAIN_WALLET)
          }
        >
          COPY ADDRESS
        </button>
      </section>

      <section className="panel">
        <h2>OPTIONAL SOL PAYMENT</h2>

        <p>
          Press GET to open the payment review. You choose
          the amount and approve the transaction in Phantom.
        </p>

        <button
          onClick={() => setShowPayment(!showPayment)}
          disabled={!wallet || busy}
        >
          {showPayment ? "CLOSE" : "GET"}
        </button>

        {showPayment && (
          <div className="payment">
            <label htmlFor="amount">AMOUNT TO PAY (SOL)</label>

            <input
              id="amount"
              type="number"
              min="0.000001"
              step="0.000001"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />

            <p><strong>Recipient:</strong></p>
            <p className="address">{MAIN_WALLET}</p>

            <p>
              <strong>Network:</strong>{" "}
              {network === "devnet"
                ? "Devnet — Test SOL"
                : "Mainnet — Real SOL"}
            </p>

            <p className="warning">
              You are making a payment to the address above.
              Check the amount and recipient carefully.
              Blockchain payments are generally irreversible.
            </p>

            <button
              onClick={sendPayment}
              disabled={busy}
            >
              {busy ? "PROCESSING..." : `PAY ${amount} SOL WITH PHANTOM`}
            </button>
          </div>
        )}

        {transactionUrl && (
          <p className="success">
            Payment confirmed!{" "}
            <a href={transactionUrl} target="_blank" rel="noreferrer">
              View transaction
            </a>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>STATUS</h2>
        <p>{status}</p>
      </section>

      <footer>HYPER DRAIN LAB · SOLANA</footer>
    </main>
  );
}

}
