"use client";

import SideSheet from "./SideSheet";
import LobbyDetail from "./LobbyDetail";

export default function LobbySheet({
  open,
  lobbyId,
  onClose,
}: {
  open: boolean;
  lobbyId: string | null;
  onClose: () => void;
}) {
  return (
    <SideSheet open={open} onClose={onClose} title="Lobby">
      {lobbyId ? <LobbyDetail id={lobbyId} /> : null}
    </SideSheet>
  );
}
