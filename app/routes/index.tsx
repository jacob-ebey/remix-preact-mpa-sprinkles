import Island from "~/enhancements/island";
import CounterIsland from "~/islands/counter";

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Remix</h1>
      <h2>Counter Island</h2>
      <Island source="~/islands/counter">
        <CounterIsland initialCount={2} />
      </Island>
    </div>
  );
}
