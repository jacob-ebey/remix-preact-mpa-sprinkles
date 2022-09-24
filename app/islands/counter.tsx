import { useState } from "preact/hooks";

export default function CounterIsland({
  initialCount,
}: {
  initialCount?: number;
}) {
  const [count, setCount] = useState(initialCount || 0);

  return (
    <p>
      <button onClick={() => setCount((c) => c - 1)}>-</button>
      <span style={{ margin: "0 1rem" }}>{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </p>
  );
}
