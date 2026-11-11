import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { roomStaysOpen } from "./sleep.js";

test("roomStaysOpen - a bed that would cut the room's back corners off from the doorway is refused (tluna5h)", () => {
  // A large home's 5x5 room around 0,0; its doorway is south, so the cell inside it is 0,2.
  const room: Vec3[] = [];
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) room.push(new Vec3(dx, 64, dz));
  const entry = new Vec3(0, 64, 2);
  // tluna5h's first two beds, east and west of the centre.
  const beds = new Set(["1,0", "2,0", "-1,0", "-2,0"]);
  const open = (cell: Vec3) => !beds.has(`${cell.x},${cell.z}`);
  assert.equal(roomStaysOpen(room, open, entry, [new Vec3(0, 64, -1), new Vec3(0, 64, -2)]), false, "north of the centre: the back corners are cut off");
  assert.equal(roomStaysOpen(room, open, entry, [new Vec3(-2, 64, -1), new Vec3(-2, 64, -2)]), true, "along the west wall: everything is still reachable");
  assert.equal(roomStaysOpen(room, open, entry, [new Vec3(0, 64, 1), new Vec3(0, 64, 2)]), false, "never on the cell inside the doorway");
});

test("roomStaysOpen - a block already on the cell inside the doorway is stepped over, not a full room (tluna28b)", () => {
  const room: Vec3[] = [];
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) room.push(new Vec3(dx, 64, dz));
  const entry = new Vec3(0, 64, 2);
  // tluna28b: a crafting table inside the doorway, a furnace and a table near the centre, a chest in a corner.
  const blocked = new Set(["0,2", "0,1", "-1,0", "-2,2"]);
  const open = (cell: Vec3) => !blocked.has(`${cell.x},${cell.z}`);
  assert.equal(roomStaysOpen(room, open, entry, [new Vec3(-2, 64, -1), new Vec3(-2, 64, 0)]), true, "along the west wall: still reachable");
  assert.equal(roomStaysOpen(room, open, entry, [new Vec3(-1, 64, 2), new Vec3(1, 64, 2)]), false, "both cells beside the doorway taken: no way in");
});
