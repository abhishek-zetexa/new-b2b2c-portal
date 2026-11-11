const paths: Record<string, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  box: "M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8",
  sim: "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 13h6v6H9z",
  plane: "M3 12l18-7-7 18-2-7-9-4z",
  users: "M8 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 19c.6-2 2.5-3 5-3s4.4 1 5 3M14 16c2.2.2 3.8 1.2 4.5 3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c1.2-3 3.4-4.5 7-4.5S17.8 17 19 20",
  orders: "M7 4h10a1 1 0 0 1 1 1v15l-2-1.2L14 20l-2-1.2L10 20l-2-1.2L6 20V5a1 1 0 0 1 1-1zM9 8h6M9 12h6",
  inventory: "M4 7h16v12H4zM8 7V5h8v2M9 12h6",
  wallet: "M4 7h16v11H4zM4 7l2-3h10l2 3M15 12.5h3",
  chart: "M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6",
  code: "M9 8L5 12l4 4M15 8l4 4-4 4M13 6l-2 12",
  palette: "M12 4a8 8 0 1 0 0 16h1.2a1.8 1.8 0 0 0 0-3.6h-.7a1.5 1.5 0 0 1 0-3h.7A5.4 5.4 0 0 0 12 4zM8 9.5h.01M9.5 7h.01M12.2 6.4h.01M14.8 7.6h.01",
  tag: "M4 12V5h7l9 9-7 7-9-9zM8.5 8.5h.01",
  help: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.9-1.2 1.6V14M12 17h.01",
  book: "M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5zM5 5.5V19",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 12l1.6-1.2-.8-2.2-2 .4a7 7 0 0 0-1.2-1.2l.4-2-2.2-.8L13.2 4h-2.4L9.6 2.4l-2.2.8.4 2a7 7 0 0 0-1.2 1.2l-2-.4-.8 2.2L5 12l-1.6 1.2.8 2.2 2-.4c.3.5.7.9 1.2 1.2l-.4 2 2.2.8 1.2-1.6h2.4l1.2 1.6 2.2-.8-.4-2c.5-.3.9-.7 1.2-1.2l2 .4.8-2.2z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c1.2-3 3.4-4.5 7-4.5S17.8 17 19 20",
  logout: "M10 7V5H5v14h5v-2M10 12h9M16 8l4 4-4 4",
  cart: "M5 7h15l-1.5 8h-12zM8 7l1-3h6l1 3M9 19.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zM17 19.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12.5l4.2 4.2L19 7.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  chat: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-4.5 3v-3H6.5A2.5 2.5 0 0 1 4 14.5z",
  send: "M21 3L10 14M21 3l-6.5 18-4-7-7-4L21 3z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  plus: "M12 5v14M5 12h14",
  edit: "M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6",
  mail: "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM3 7l9 6 9-6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 0 0 0 18M12 3a13.5 13.5 0 0 1 0 18",
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.grid} />
    </svg>
  );
}
