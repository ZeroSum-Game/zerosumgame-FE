import type { ReactNode } from 'react';

type Props = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

const GameLayout = ({ left, center, right }: Props) => {
  return (
    <div className="dash-layout">
      <aside className="dash-panel dash-panel-left">{left}</aside>
      <main className="dash-center">{center}</main>
      <aside className="dash-panel dash-panel-right">{right}</aside>
    </div>
  );
};

export default GameLayout;

