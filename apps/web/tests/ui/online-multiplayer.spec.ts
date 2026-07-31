import { expect, test, type Page } from '@playwright/test';

import { startMockRelayServer, type MockRelayServer } from '../mock-relay/mockRelayServer.ts';
import { gotoApp } from './helpers.ts';

/**
 * Full online multiplayer flow against the in-process mock relay server
 * (`tests/mock-relay/`): the host creates a room, a guest joins it, both ready
 * up, the host starts the game, both seats exchange real moves through the
 * host-authoritative runtime, and the game ends for everyone.
 *
 * The mock relay is deterministic: seats are not shuffled, so the host
 * (seat 0) always plays first, and room codes are sequential.
 */

const HOST_NAME = 'Alice';
const GUEST_NAME = 'Bob';

test.describe('Online multiplayer', () => {
  // Two full app instances talk through the relay; leave slack for a cold dev server.
  test.describe.configure({ timeout: 120_000 });

  let relay: MockRelayServer;

  test.beforeAll(async () => {
    relay = await startMockRelayServer();
  });

  test.afterAll(async () => {
    await relay.close();
  });

  const openApp = async (page: Page) => {
    await gotoApp(page, {
      runtimeConfig: { apiBaseUrl: relay.apiBaseUrl, appVersion: '', minimumSupportedVersion: '' },
    });
  };

  const readyUp = async (page: Page, name: string) => {
    await page.getByLabel('Votre nom').fill(name);
    await page.getByRole('button', { name: 'Je suis prêt' }).click();
  };

  /**
   * Creates a room and returns its code, read from the host's own lobby rather
   * than from `relay.rooms` — these specs run in parallel against one relay, so
   * "the most recently created room" can belong to a different test.
   */
  const createRoom = async (hostPage: Page): Promise<string> => {
    await openApp(hostPage);
    await hostPage.getByTestId('new-game-trigger').click();
    await hostPage.getByTestId('new-game-mode-create-online').click();
    await hostPage.getByTestId('new-game-create-online').click();
    await expect(hostPage.getByRole('heading', { name: "Salle d'attente" })).toBeVisible();

    const roomCode = (await hostPage.getByTestId('lobby-room-code').innerText()).trim();
    expect(roomCode).not.toBe('');
    return roomCode;
  };

  const joinRoom = async (guestPage: Page, roomCode: string) => {
    await openApp(guestPage);
    await guestPage.getByTestId('new-game-trigger').click();
    await guestPage.getByTestId('new-game-mode-join-online').click();
    await guestPage.getByTestId('new-game-room-code-input').fill(roomCode);
    await guestPage.getByTestId('new-game-join-online').click();
  };

  /**
   * Lobby to first move. The mock relay does not shuffle seats, so the host
   * always plays first once this resolves.
   */
  const startTwoSeatGame = async (hostPage: Page, guestPage: Page): Promise<string> => {
    const roomCode = await createRoom(hostPage);
    await joinRoom(guestPage, roomCode);

    await readyUp(guestPage, GUEST_NAME);
    await readyUp(hostPage, HOST_NAME);
    await hostPage.getByRole('button', { name: 'Démarrer la partie' }).click();
    await expect(hostPage.getByTestId('game-message')).toHaveText("C'est votre tour");

    return roomCode;
  };

  /** Selects the first hand card and discards it onto the first discard pile. */
  const discardFirstHandCard = async (page: Page): Promise<string> => {
    const localArea = page.getByTestId('human-player-area');
    const firstHandCard = localArea.getByLabel('Hand card 1');
    const cardValue = (await firstHandCard.locator('.card-number').innerText()).trim();
    await firstHandCard.click();
    await expect(page.getByTestId('game-message')).toHaveText('Sélectionnez une destination');
    await localArea.getByLabel('Défausse 1').click();
    return cardValue;
  };

  test('@desktop host and guest play an online game end to end', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // --- Host creates the room ------------------------------------------
      await openApp(hostPage);
      await hostPage.getByTestId('new-game-trigger').click();
      await hostPage.getByTestId('new-game-mode-create-online').click();
      await hostPage.getByTestId('new-game-create-online').click();

      const hostLobby = hostPage.getByRole('dialog', { name: "Salle d'attente" });
      await expect(hostLobby).toBeVisible();
      const roomCode = (await hostLobby.getByTestId('lobby-room-code').innerText()).trim();
      // The relay really did create this room — the code on screen is not a stub.
      expect(relay.rooms.has(roomCode)).toBe(true);

      // --- Guest joins with the room code ---------------------------------
      await openApp(guestPage);
      await guestPage.getByTestId('new-game-trigger').click();
      await guestPage.getByTestId('new-game-mode-join-online').click();
      await guestPage.getByTestId('new-game-room-code-input').fill(roomCode);
      await guestPage.getByTestId('new-game-join-online').click();
      await expect(guestPage.getByRole('heading', { name: "Salle d'attente" })).toBeVisible();

      // --- Both ready up; the host starts the game -------------------------
      await readyUp(guestPage, GUEST_NAME);
      await expect(hostPage.getByText(GUEST_NAME)).toBeVisible();
      await readyUp(hostPage, HOST_NAME);
      await expect(hostPage.getByText('Tous les joueurs sont prêts !')).toBeVisible();
      await hostPage.getByRole('button', { name: 'Démarrer la partie' }).click();

      // Seats are not shuffled by the mock relay: the host plays first.
      await expect(hostPage.getByTestId('game-message')).toHaveText("C'est votre tour");
      await expect(guestPage.getByTestId('game-message')).toHaveText(new RegExp(`Tour de ${HOST_NAME}`));

      // Redaction: the guest sees the host's five hand cards face down.
      await expect(guestPage.locator('[data-testid="ai-player-area"] .hand-area .card .back')).toHaveCount(5);

      // --- Host plays a move (discard ends the turn) -----------------------
      const hostCardValue = await discardFirstHandCard(hostPage);
      await expect(hostPage.getByTestId('game-message')).toHaveText(new RegExp(`Tour de ${GUEST_NAME}`));
      await expect(guestPage.getByTestId('game-message')).toHaveText("C'est votre tour");

      // The host's discard pile is public: the guest sees the discarded card.
      await expect(
        guestPage.locator('[data-testid="ai-player-area"] .discard-pile-stack[data-pile-index="0"] .card-number'),
      ).toHaveText(hostCardValue);

      // --- Guest answers with a move of their own --------------------------
      const guestCardValue = await discardFirstHandCard(guestPage);
      await expect(guestPage.getByTestId('game-message')).toHaveText(new RegExp(`Tour de ${HOST_NAME}`));
      await expect(hostPage.getByTestId('game-message')).toHaveText("C'est votre tour");
      await expect(
        hostPage.locator('[data-testid="ai-player-area"] .discard-pile-stack[data-pile-index="0"] .card-number'),
      ).toHaveText(guestCardValue);

      // --- End the game; both seats see the same outcome --------------------
      await hostPage.getByTestId('debug-win-button').click();
      await expect(hostPage.getByTestId('game-message')).toHaveText('Vous avez gagné !');
      await expect(guestPage.getByTestId('game-message')).toHaveText(`${HOST_NAME} a gagné.`);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('@desktop the keyboard drives a move that reaches the other seat', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await startTwoSeatGame(hostPage, guestPage);

      const hostArea = hostPage.getByTestId('human-player-area');
      const cardValue = (await hostArea.getByLabel('Hand card 1').locator('.card-number').innerText()).trim();

      // Select with `w`, arm défausse 1 with `u`, confirm with Space.
      await hostPage.keyboard.press('w');
      await expect(hostPage.getByTestId('game-message')).toHaveText('Sélectionnez une destination');

      await hostPage.keyboard.press('u');
      await expect(hostArea.locator('[data-pile-index="0"]')).toHaveAttribute('data-armed', 'true');

      await hostPage.keyboard.press('Space');

      // The keyboard move goes through the host runtime and lands on the guest.
      await expect(hostPage.getByTestId('game-message')).toHaveText(new RegExp(`Tour de ${GUEST_NAME}`));
      await expect(
        guestPage.locator('[data-testid="ai-player-area"] .discard-pile-stack[data-pile-index="0"] .card-number'),
      ).toHaveText(cardValue);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('@desktop guest cannot join a started game', async ({ browser, page }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const firstGuestPage = await guestContext.newPage();

    try {
      const roomCode = await startTwoSeatGame(hostPage, firstGuestPage);

      // A latecomer is rejected because the room is no longer WAITING.
      await openApp(page);
      await page.getByTestId('new-game-trigger').click();
      await page.getByTestId('new-game-mode-join-online').click();
      await page.getByTestId('new-game-room-code-input').fill(roomCode);
      await page.getByTestId('new-game-join-online').click();
      await expect(page.getByTestId('new-game-error')).toContainText('La partie a déjà commencé.');
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
