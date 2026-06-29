import type { AuxInput } from "./tools/Tool";

export interface GamepadInput {
  aux:            AuxInput;
  triggerPressed: boolean;
  gripPressed:    boolean;
}

// Decode the WebXR controller gamepad: thumbstick → aux (4-axis layouts put the
// stick on axes 2/3, 2-axis layouts on 0/1), trigger = button 0, grip = button 1.
export function readGamepad(gamepad: Gamepad): GamepadInput {
  const axes = gamepad.axes;
  return {
    aux: {
      x: axes.length > 3 ? axes[2] : (axes[0] ?? 0),
      y: axes.length > 3 ? axes[3] : (axes[1] ?? 0),
    },
    triggerPressed: gamepad.buttons[0]?.pressed ?? false,
    gripPressed:    gamepad.buttons[1]?.pressed ?? false,
  };
}
