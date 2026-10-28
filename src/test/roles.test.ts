import { describe, it, expect } from "vitest";
import { assignRoles } from "@/lib/game.functions";
const count = (r: string[], x: string) => r.filter((y) => y === x).length;
describe("assignRoles", () => {
  it("23 players: 3 mafia, 1 joker, 1 detective, 1 doctor, 17 civilians", () => {
    const r = assignRoles(23);
    expect([count(r,"Mafia"),count(r,"Joker"),count(r,"Detective"),count(r,"Doctor"),count(r,"Civilian")]).toEqual([3,1,1,1,17]);
  });
  it("6 players: no civilians", () => { expect(count(assignRoles(6),"Civilian")).toBe(0); });
});
