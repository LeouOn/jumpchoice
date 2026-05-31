import type { FastifyReply } from "fastify";
import {
  PROFESSOR_MARI_ID,
} from "@jumpchoice/shared";
import type {
  CharacterCommand,
  ScheduleUpdateCommand,
  CrossPostCommand,
  SelfieCommand,
  MemoryCommand,
  InfluenceCommand,
  NoteCommand,
  DirectMessageCommand,
  SceneCommand,
  HapticCommand,
  SpotifyCommand,
  CreatePersonaCommand,
  CreateCharacterCommand,
  UpdateCharacterCommand,
  UpdatePersonaCommand,
  CreateLorebookCommand,
  UpdateLorebookCommand,
  CreateChatCommand,
  NavigateCommand,
  FetchCommand,
} from "../conversation/character-commands.js";
import {
  parseDuration,
} from "../conversation/character-commands.js";
import {
  ConversationSpotifyCommandError,
  isSilentConversationSpotifyCommandError,
  playConversationSpotifyCommand,
} from "../spotify/conversation-spotify-command.service.js";
import {
  recordAssistantActivity,
} from "../conversation/autonomous.service.js";
import { stripConversationPromptTimestamps } from "../conversation/transcript-sanitize.js";
import { createPromptOverridesStorage } from "../storage/prompt-overrides.storage.js";
import { loadPrompt, CONVERSATION_SELFIE } from "../prompt-overrides/index.js";
import { renderTemplate } from "../prompt-overrides/template.js";
import { resolveConnectionImageDefaults } from "../image/image-generation-defaults.js";
import { loadImageGenerationUserSettings } from "../image/image-generation-settings.js";
import {
  parseExtra,
} from "../../routes/generate/generate-route-utils.js";
import {
  trySendSseEvent,
} from "../../routes/generate/sse.js";
import {
  createStandardProvider,
} from "../../routes/generate/provider.routes.js";
import { logger } from "../../lib/logger.js";
import {
  areConversationSchedulesEnabled,
  getEnabledConversationSchedules,
  bumpCharacterVersion,
  normalizeDmTargetName,
} from "./helpers.js";

import type { CharInfoEntry } from "./types.js";

export interface CommandDispatchContext {
  db: any;
  app: any;
  chats: any;
  chars: any;
  connections: any;
  conn: any;
  lorebooksStore: any;
  agentsStore: any;
  presets: any;
  reply: FastifyReply;
  input: any;
  chat: any;
  chatMeta: Record<string, unknown>;
  characterIds: string[];
  charInfo: CharInfoEntry[];
  chatMode: string;
  fullResponse: string;
  baseUrl: string;
  abortController: AbortController;
}

export interface CommandDispatchResult {
  mariFetchSucceeded: boolean;
}

export async function dispatchCharacterCommands(
  ctx: CommandDispatchContext,
  collectedCommands: Array<{
    command: CharacterCommand;
    characterId: string | null;
    messageId: string;
    swipeIndex: number;
  }>,
): Promise<CommandDispatchResult> {
  const {
    db, app, chats, chars, connections, conn, lorebooksStore, agentsStore,
    presets, reply, input, chat, chatMeta, characterIds, charInfo, chatMode,
    fullResponse, baseUrl, abortController,
  } = ctx;
  let mariFetchSucceeded = false;

  // ────────────────────────────────────────
  // Character Command Execution (Conversation mode)
  // ────────────────────────────────────────
  if (collectedCommands.length > 0 && !abortController.signal.aborted) {
    const professorMariCommandTypes = new Set([
      "create_persona",
      "create_character",
      "update_character",
      "update_persona",
      "create_lorebook",
      "update_lorebook",
      "create_chat",
      "navigate",
      "fetch",
    ]);
    const professorMariCommandCount = collectedCommands.filter(({ command }) =>
      professorMariCommandTypes.has(command.type),
    ).length;
    trySendSseEvent(reply, {
      type: "assistant_commands_start",
      data: { count: collectedCommands.length, professorMariCommandCount },
    });
    try {
      for (const { command, characterId, messageId, swipeIndex } of collectedCommands) {
        try {
          if (command.type === "schedule_update") {
            // ── Schedule Update: modify the character's current schedule block ──
            const schedCmd = command as ScheduleUpdateCommand;
            if (characterId && (schedCmd.status || schedCmd.activity)) {
              const freshChat = await chats.getById(input.chatId);
              const freshMeta =
                typeof freshChat?.metadata === "string"
                  ? JSON.parse(freshChat.metadata)
                  : (freshChat?.metadata ?? {});
              const schedules: Record<string, any> = getEnabledConversationSchedules(freshMeta);
              const schedule = schedules[characterId];
              if (schedule) {
                const nowDate = new Date();
                const DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                const dayName = DAYS_LIST[(nowDate.getDay() + 6) % 7]!;
                const daySchedule: Array<{ time: string; activity: string; status: string }> =
                  schedule.days?.[dayName] ?? [];
                const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

                // Find the current time block and update it
                let updated = false;
                for (const block of daySchedule) {
                  const [startStr, endStr] = block.time.split("-");
                  if (!startStr || !endStr) continue;
                  const [sh, sm] = startStr.split(":").map(Number);
                  const [eh, em] = endStr.split(":").map(Number);
                  const startMin = (sh ?? 0) * 60 + (sm ?? 0);
                  const endMin = (eh ?? 0) * 60 + (em ?? 0);
                  if (startMin <= currentMinutes && currentMinutes < endMin) {
                    if (schedCmd.status) block.status = schedCmd.status;
                    if (schedCmd.activity) block.activity = schedCmd.activity;

                    // If duration specified, split the block
                    if (schedCmd.duration) {
                      const durationMin = parseDuration(schedCmd.duration);
                      if (durationMin && currentMinutes + durationMin < endMin) {
                        const splitTime = currentMinutes + durationMin;
                        const splitH = String(Math.floor(splitTime / 60)).padStart(2, "0");
                        const splitM = String(splitTime % 60).padStart(2, "0");
                        // Shorten current block to end at the split point
                        block.time = `${startStr}-${splitH}:${splitM}`;
                        // Insert a new block for the remainder with the original activity/status
                        const idx = daySchedule.indexOf(block);
                        daySchedule.splice(idx + 1, 0, {
                          time: `${splitH}:${splitM}-${endStr}`,
                          activity: "free time",
                          status: "online",
                        });
                      }
                    }
                    updated = true;
                    break;
                  }
                }

                if (updated) {
                  schedule.days[dayName] = daySchedule;
                  schedules[characterId] = schedule;
                  await chats.updateMetadata(input.chatId, { ...freshMeta, characterSchedules: schedules });

                  // Update character's conversationStatus
                  const charRow = await chars.getById(characterId);
                  if (charRow) {
                    const charData = JSON.parse(charRow.data as string);
                    const newStatus = schedCmd.status ?? charData.extensions?.conversationStatus ?? "online";
                    const extensions = { ...(charData.extensions ?? {}), conversationStatus: newStatus };
                    await chars.update(characterId, { extensions } as any);
                  }

                  // Sync to other chats with this character
                  const allChatsList = await chats.list();
                  for (const c of allChatsList) {
                    if (c.id === input.chatId || c.mode !== "conversation") continue;
                    const cCharIds: string[] =
                      typeof c.characterIds === "string"
                        ? JSON.parse(c.characterIds as string)
                        : (c.characterIds as string[]);
                    if (!cCharIds.includes(characterId)) continue;
                    const cMeta =
                      typeof c.metadata === "string" ? JSON.parse(c.metadata as string) : (c.metadata ?? {});
                    if (!areConversationSchedulesEnabled(cMeta)) continue;
                    const cScheds = cMeta.characterSchedules ?? {};
                    cScheds[characterId] = schedule;
                    await chats.updateMetadata(c.id, { ...cMeta, characterSchedules: cScheds });
                  }

                  reply.raw.write(
                    `data: ${JSON.stringify({
                      type: "schedule_updated",
                      data: { characterId, status: schedCmd.status, activity: schedCmd.activity },
                    })}\n\n`,
                  );
                  logger.info(
                    `[commands] Schedule updated for ${characterId}: status=${schedCmd.status}, activity=${schedCmd.activity}`,
                  );
                }
              }
            }
          } else if (command.type === "cross_post") {
            // ── Cross-Post: copy/redirect message to another chat ──
            const crossCmd = command as CrossPostCommand;
            const targetName = crossCmd.target.toLowerCase();

            // Find the target chat by name
            const allChatsList = await chats.list();
            const targetChat = allChatsList.find(
              (c: any) =>
                c.mode === "conversation" &&
                c.id !== input.chatId &&
                (c.name?.toLowerCase().includes(targetName) || c.id === crossCmd.target),
            );

            if (targetChat) {
              // Get the clean response (commands already stripped)
              const msgRow = messageId ? await chats.getMessage(messageId) : null;
              const msgContent = msgRow?.content ?? fullResponse;

              // Create the message in the target chat
              await chats.createMessage({
                chatId: targetChat.id,
                role: "assistant",
                characterId,
                content: msgContent,
              });

              // Remove the original message from the source chat (redirect, not copy)
              if (messageId) {
                await chats.removeMessage(messageId);
              }

              reply.raw.write(
                `data: ${JSON.stringify({
                  type: "cross_post",
                  data: {
                    targetChatId: targetChat.id,
                    targetChatName: targetChat.name,
                    sourceChatId: input.chatId,
                    characterId,
                  },
                })}\n\n`,
              );
              logger.info(`[commands] Cross-posted message to chat "${targetChat.name}" (${targetChat.id})`);
            } else {
              logger.warn(`[commands] Cross-post target "${crossCmd.target}" not found`);
            }
          } else if (command.type === "selfie") {
            // ── Selfie: generate an image from the character's appearance ──
            const selfieCmd = command as SelfieCommand;

            // Use the chat-level image gen connection (set by user in chat settings)
            const imgConnId = chatMeta.imageGenConnectionId as string | undefined;
            if (imgConnId) {
              // Show typing indicator while generating the selfie
              const charRow = characterId ? await chars.getById(characterId) : null;
              const charData = charRow ? JSON.parse(charRow.data as string) : null;
              const charName = charData?.name ?? "character";
              reply.raw.write(`data: ${JSON.stringify({ type: "typing", characters: [charName] })}\n\n`);

              try {
                const imgConnFull = await connections.getWithKey(imgConnId);
                if (!imgConnFull) throw new Error("Cannot decrypt image generation connection");

                // Build selfie prompt from character appearance + context
                const appearance = charData?.extensions?.appearance ?? charData?.description ?? "";

                // Use the LLM to build a proper image prompt
                const selfieTags: string[] = Array.isArray(chatMeta.selfieTags)
                  ? (chatMeta.selfieTags as string[])
                  : [];
                const selfiePositivePrompt =
                  typeof chatMeta.selfiePositivePrompt === "string"
                    ? chatMeta.selfiePositivePrompt.trim()
                    : selfieTags.join(", ").trim();
                const selfieNegativePrompt = ((chatMeta.selfieNegativePrompt as string) ?? "").trim();
                const selfiePromptTemplate =
                  typeof chatMeta.selfiePrompt === "string" ? chatMeta.selfiePrompt.trim() : "";
                const promptBuilder = createStandardProvider(conn, baseUrl);
                const selfiePromptContext = {
                  appearance,
                  charName,
                  selfieTagsBlock: "",
                };
                const selfieSystemPrompt = selfiePromptTemplate
                  ? renderTemplate(
                      selfiePromptTemplate,
                      selfiePromptContext,
                      CONVERSATION_SELFIE.variables.map((variable) => variable.name),
                    )
                  : await loadPrompt(
                      createPromptOverridesStorage(db),
                      CONVERSATION_SELFIE,
                      selfiePromptContext,
                    );
                const promptResult = await promptBuilder.chatComplete(
                  [
                    {
                      role: "system",
                      content: selfieSystemPrompt,
                    },
                    {
                      role: "user",
                      content: selfieCmd.context
                        ? `Context for the selfie: ${selfieCmd.context}`
                        : `Generate a casual selfie of ${charName} based on the current conversation context.`,
                    },
                  ],
                  { model: conn.model, temperature: 0.7, maxTokens: 8196 },
                );

                const imagePrompt = (promptResult.content ?? "").trim();
                if (imagePrompt) {
                  const finalSelfiePrompt = selfiePositivePrompt
                    ? `${imagePrompt}, ${selfiePositivePrompt}`
                    : imagePrompt;
                  const { generateImage, saveImageToDisk } =
                    await import("../image/image-generation.js");
                  const { createGalleryStorage } = await import("../storage/gallery.storage.js");
                  const galleryStore = createGalleryStorage(db);

                  const imgModel = imgConnFull.model || "";
                  const imgBaseUrl = imgConnFull.baseUrl || "https://image.pollinations.ai";
                  const imgApiKey = imgConnFull.apiKey || "";
                  const imgSource = (imgConnFull as any).imageGenerationSource || imgModel;
                  const imageDefaults = resolveConnectionImageDefaults(imgConnFull);
                  const imageSettings = await loadImageGenerationUserSettings(db);

                  // Parse per-chat selfie resolution, otherwise use the global selfie canvas.
                  const selfieRes = (chatMeta.selfieResolution as string) ?? "";
                  const [selfieW, selfieH] = selfieRes.split("x").map(Number) as [number, number];

                  const serviceHint = imgConnFull.imageService || "";
                  const imageResult = await generateImage(
                    imgModel,
                    imgBaseUrl,
                    imgApiKey,
                    serviceHint || imgSource,
                    {
                      prompt: finalSelfiePrompt,
                      negativePrompt: selfieNegativePrompt || undefined,
                      model: imgModel,
                      width: selfieW || imageSettings.selfie.width,
                      height: selfieH || imageSettings.selfie.height,
                      imageEndpointId: imgConnFull.imageEndpointId || undefined,
                      comfyWorkflow: imgConnFull.comfyuiWorkflow || undefined,
                      imageDefaults,
                    },
                  );

                  // Save to disk and DB
                  const filePath = saveImageToDisk(input.chatId, imageResult.base64, imageResult.ext);
                  const galleryEntry = await galleryStore.create({
                    chatId: input.chatId,
                    filePath,
                    prompt: finalSelfiePrompt,
                    provider: imgConnFull.provider ?? "image_generation",
                    model: imgModel || "unknown",
                    width: selfieW || imageSettings.selfie.width,
                    height: selfieH || imageSettings.selfie.height,
                  });

                  // Attach the image to the message
                  const filename = filePath.split("/").pop()!;
                  const imageUrl = `/api/gallery/file/${input.chatId}/${encodeURIComponent(filename)}`;
                  if (messageId) {
                    const generationSwipeIndex = Number.isInteger(swipeIndex) ? swipeIndex : 0;
                    const attachment = {
                      type: "image",
                      url: imageUrl,
                      filename: `selfie_${charName.toLowerCase().replace(/\s+/g, "_")}.${imageResult.ext}`,
                      prompt: finalSelfiePrompt,
                      galleryId: (galleryEntry as any)?.id,
                    };
                    await chats.appendSwipeAttachment(messageId, generationSwipeIndex, attachment);

                    const currentMsgRow = await chats.getMessage(messageId);
                    if (currentMsgRow && (currentMsgRow.activeSwipeIndex ?? 0) === generationSwipeIndex) {
                      await chats.appendMessageAttachment(messageId, attachment);
                    }
                  }

                  // Send selfie event to client
                  reply.raw.write(
                    `data: ${JSON.stringify({
                      type: "selfie",
                      data: {
                        characterId,
                        characterName: charName,
                        messageId,
                        imageUrl,
                        prompt: finalSelfiePrompt,
                        galleryId: (galleryEntry as any)?.id,
                      },
                    })}\n\n`,
                  );
                  logger.debug("[commands] Selfie generated for %s", charName);
                }
              } catch (imgErr) {
                logger.error(imgErr, "[commands] Selfie generation failed");
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "selfie_error",
                    data: {
                      characterId,
                      error: imgErr instanceof Error ? imgErr.message : "Image generation failed",
                    },
                  })}\n\n`,
                );
              }
            } else {
              logger.warn("[commands] Selfie requested but no imageGenConnectionId set on chat metadata");
              reply.raw.write(
                `data: ${JSON.stringify({
                  type: "selfie_error",
                  data: {
                    characterId,
                    error: "No image generation connection configured for this chat. Set one in Chat Settings.",
                  },
                })}\n\n`,
              );
            }
          } else if (command.type === "memory") {
            // ── Memory: store a fake memory on the target character ──
            const memCmd = command as MemoryCommand;
            const targetName = memCmd.target.toLowerCase();

            // Resolve source character name
            const srcCharRow = characterId ? await chars.getById(characterId) : null;
            const srcCharData = srcCharRow ? JSON.parse(srcCharRow.data as string) : null;
            const srcCharName = srcCharData?.name ?? "Unknown";

            // Find target character by name across all characters
            const allCharsList = await chars.list();
            const targetChar = allCharsList.find((c: any) => {
              const d = typeof c.data === "string" ? JSON.parse(c.data) : c.data;
              return d.name?.toLowerCase() === targetName;
            });

            if (targetChar) {
              const targetData =
                typeof targetChar.data === "string" ? JSON.parse(targetChar.data as string) : targetChar.data;
              const extensions = { ...(targetData.extensions ?? {}) };
              const memories: Array<{ from: string; fromCharId: string; summary: string; createdAt: string }> =
                extensions.characterMemories ?? [];

              memories.push({
                from: srcCharName,
                fromCharId: characterId ?? "",
                summary: memCmd.summary,
                createdAt: new Date().toISOString(),
              });

              extensions.characterMemories = memories;
              await chars.update(targetChar.id, { extensions } as any);

              logger.info(
                `[commands] Memory created: "${srcCharName}" → "${targetData.name}": ${memCmd.summary}`,
              );
            } else {
              logger.warn(`[commands] Memory target character "${memCmd.target}" not found`);
            }
          }

          if (command.type === "influence") {
            // ── Influence: queue OOC influence for the connected chat ──
            const infCmd = command as InfluenceCommand;
            const freshChat = await chats.getById(input.chatId);
            const connectedId = freshChat?.connectedChatId as string | null;
            if (connectedId) {
              const influenceContent = stripConversationPromptTimestamps(infCmd.content);
              if (!influenceContent) continue;
              await chats.createInfluence(input.chatId, connectedId, influenceContent, messageId);
              logger.info(
                `[commands] OOC influence queued for connected chat ${connectedId}: "${influenceContent.slice(0, 80)}..."`,
              );
            } else {
              logger.warn("[commands] Influence command used but no connected chat");
            }
          }

          if (command.type === "note") {
            // ── Note: persist a durable note in the connected roleplay's prompt ──
            const noteCmd = command as NoteCommand;
            const freshChat = await chats.getById(input.chatId);
            const connectedId = freshChat?.connectedChatId as string | null;
            if (connectedId) {
              const noteContent = stripConversationPromptTimestamps(noteCmd.content);
              if (!noteContent) continue;
              await chats.createNote(input.chatId, connectedId, noteContent, messageId);
              logger.info(
                `[commands] Conversation note saved for connected chat ${connectedId}: "${noteContent.slice(0, 80)}..."`,
              );
            } else {
              logger.warn("[commands] Note command used but no connected chat");
            }
          }

          if (command.type === "spotify") {
            // ── Spotify: play a selected track on the user's active Spotify player ──
            const spotifyCmd = command as SpotifyCommand;
            if (chatMode !== "conversation") {
              logger.debug("[spotify/conversation] Ignored song command outside conversation mode");
              continue;
            }
            try {
              const result = await playConversationSpotifyCommand({
                storage: agentsStore,
                title: spotifyCmd.title,
                artist: spotifyCmd.artist,
              });
              trySendSseEvent(reply, {
                type: "spotify_command",
                data: {
                  title: spotifyCmd.title,
                  artist: spotifyCmd.artist,
                  track: result.track,
                },
              });
              logger.info(
                '[spotify/conversation] Played "%s" by "%s" for chat %s',
                result.track.name,
                result.track.artist,
                input.chatId,
              );
            } catch (err) {
              if (isSilentConversationSpotifyCommandError(err)) {
                logger.debug(
                  '[spotify/conversation] Dropped unavailable song command: "%s" by "%s" - %s',
                  spotifyCmd.title,
                  spotifyCmd.artist,
                  err.message,
                );
                continue;
              }
              const message = err instanceof Error ? err.message : "Spotify song command failed.";
              trySendSseEvent(reply, {
                type: "spotify_command_error",
                data: {
                  title: spotifyCmd.title,
                  artist: spotifyCmd.artist,
                  error: message,
                },
              });
              if (err instanceof ConversationSpotifyCommandError) {
                logger.warn(
                  '[spotify/conversation] Song command failed (%d): "%s" by "%s" - %s',
                  err.status,
                  spotifyCmd.title,
                  spotifyCmd.artist,
                  err.message,
                );
              } else {
                logger.warn(err, "[spotify/conversation] Song command failed");
              }
            }
          }

          if (command.type === "dm") {
            // ── Roleplay DM: post into the linked conversation when available; otherwise create a DM chat ──
            const dmCmd = command as DirectMessageCommand;
            try {
              const requestedTarget = dmCmd.character.trim();
              const requestedKey = normalizeDmTargetName(requestedTarget);
              const messageText = stripConversationPromptTimestamps(dmCmd.message).trim().slice(0, 4000);
              if (!requestedKey || !messageText) continue;

              const roleplayTarget = charInfo.find(
                (character) =>
                  character.id === requestedTarget || normalizeDmTargetName(character.name) === requestedKey,
              );
              let targetCharId = roleplayTarget?.id ?? null;
              let targetName = roleplayTarget?.name ?? requestedTarget;

              if (!targetCharId) {
                const allCharsList = await chars.list();
                const targetChar = allCharsList.find((candidate: any) => {
                  if (candidate.id === requestedTarget) return true;
                  const data =
                    typeof candidate.data === "string" ? JSON.parse(candidate.data as string) : candidate.data;
                  const candidateName = typeof data?.name === "string" ? data.name : "";
                  return normalizeDmTargetName(candidateName) === requestedKey;
                });
                if (targetChar) {
                  const targetData =
                    typeof targetChar.data === "string" ? JSON.parse(targetChar.data as string) : targetChar.data;
                  targetCharId = targetChar.id;
                  targetName = targetData?.name ?? requestedTarget;
                }
              }

              if (!targetCharId) {
                logger.warn('[commands] DM target character "%s" not found', dmCmd.character);
                continue;
              }

              const freshChat = await chats.getById(input.chatId);
              const connectedId = freshChat?.connectedChatId as string | null;
              const connectedChat = connectedId ? await chats.getById(connectedId) : null;
              const linkedConversationId = connectedChat?.mode === "conversation" ? connectedChat.id : null;

              if (linkedConversationId) {
                const dmMessage = await chats.createMessage({
                  chatId: linkedConversationId,
                  role: "assistant",
                  characterId: targetCharId,
                  content: messageText,
                });
                recordAssistantActivity(linkedConversationId, targetCharId);

                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "assistant_action",
                    data: {
                      action: "dm_posted",
                      chatId: linkedConversationId,
                      mode: "conversation",
                      characterName: targetName,
                      sourceChatId: input.chatId,
                      sourceMessageId: messageId || null,
                      messageId: dmMessage?.id ?? null,
                    },
                  })}\n\n`,
                );
                logger.info(
                  '[commands] Roleplay DM from "%s" posted to linked conversation %s from chat %s',
                  targetName,
                  linkedConversationId,
                  input.chatId,
                );
                continue;
              }

              const newChat = await chats.create({
                name: `DM with ${targetName}`,
                mode: "conversation",
                characterIds: [targetCharId],
                groupId: null,
                personaId: (chat.personaId as string | null) ?? null,
                promptPresetId: null,
                connectionId: (chat.connectionId as string | null) ?? null,
              });
              if (!newChat) throw new Error("Failed to create DM conversation");

              await chats.patchMetadata(newChat.id, {
                dmOriginChatId: input.chatId,
                dmOriginChatName: chat.name ?? null,
                dmOriginMessageId: messageId || null,
              });
              const dmMessage = await chats.createMessage({
                chatId: newChat.id,
                role: "assistant",
                characterId: targetCharId,
                content: messageText,
              });
              recordAssistantActivity(newChat.id, targetCharId);

              reply.raw.write(
                `data: ${JSON.stringify({
                  type: "assistant_action",
                  data: {
                    action: "chat_created",
                    chatId: newChat.id,
                    chatName: newChat.name ?? `DM with ${targetName}`,
                    mode: "conversation",
                    characterName: targetName,
                    sourceChatId: input.chatId,
                    sourceMessageId: messageId || null,
                    messageId: dmMessage?.id ?? null,
                  },
                })}\n\n`,
              );
              logger.info(
                '[commands] Roleplay DM conversation created with "%s" (%s) from chat %s',
                targetName,
                newChat.id,
                input.chatId,
              );
            } catch (err) {
              logger.error(err, "[commands] Roleplay DM creation failed");
            }
          }

          if (command.type === "haptic") {
            // ── Haptic: send command to connected intimate devices ──
            const hapCmd = command as HapticCommand;
            try {
              const { hapticService } = await import("../haptic/buttplug-service.js");
              if (hapticService.connected && hapticService.devices.length > 0) {
                await hapticService.executeCommand({
                  deviceIndex: "all",
                  action: hapCmd.action,
                  intensity: hapCmd.intensity,
                  duration: hapCmd.duration,
                });
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "haptic_command",
                    data: { action: hapCmd.action, intensity: hapCmd.intensity, duration: hapCmd.duration },
                  })}\n\n`,
                );
                logger.info(
                  `[commands] Haptic: ${hapCmd.action} intensity=${hapCmd.intensity ?? "default"} duration=${hapCmd.duration ?? "indefinite"}`,
                );
              } else if (!hapticService.connected) {
                logger.warn(
                  `[commands] Haptic command [${hapCmd.action}] skipped — Intiface Central not connected`,
                );
              } else {
                logger.warn(`[commands] Haptic command [${hapCmd.action}] skipped — no devices found`);
              }
            } catch (hapErr) {
              logger.error(hapErr, "[commands] Haptic command failed");
            }
          }

          if (command.type === "scene") {
            // ── Scene: plan + create a mini-roleplay branching from this conversation ──
            const scnCmd = command as SceneCommand;
            try {
              const originChat = await chats.getById(input.chatId);
              if (!originChat) throw new Error("Origin chat not found");

              const originCharIds: string[] =
                typeof originChat.characterIds === "string"
                  ? JSON.parse(originChat.characterIds)
                  : (originChat.characterIds as string[]);

              // Resolve initiator name
              const initiatorRow = characterId ? await chars.getById(characterId) : null;
              const initiatorData = initiatorRow
                ? typeof initiatorRow.data === "string"
                  ? JSON.parse(initiatorRow.data as string)
                  : initiatorRow.data
                : null;
              const initiatorName = initiatorData?.name ?? "Character";

              // Call /scene/plan internally to get a comprehensive plan
              const planRes = await app.inject({
                method: "POST",
                url: "/api/scene/plan",
                payload: {
                  chatId: input.chatId,
                  prompt: scnCmd.scenario,
                  connectionId: null,
                },
              });
              const planBody = JSON.parse(planRes.body);
              if (!planBody.plan) throw new Error("Scene plan failed");

              // Override background if the character specified one
              if (scnCmd.background) {
                planBody.plan.background = scnCmd.background;
              }

              // Call /scene/create with the full plan
              const createRes = await app.inject({
                method: "POST",
                url: "/api/scene/create",
                payload: {
                  originChatId: input.chatId,
                  initiatorCharId: characterId,
                  plan: planBody.plan,
                  connectionId: null,
                },
              });
              const createBody = JSON.parse(createRes.body);

              if (createBody.chatId) {
                // Notify client
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "scene_created",
                    data: {
                      sceneChatId: createBody.chatId,
                      sceneChatName: createBody.chatName,
                      description: createBody.description,
                      background: createBody.background ?? null,
                      initiatorCharId: characterId,
                      initiatorCharName: initiatorName,
                    },
                  })}\n\n`,
                );
                logger.info(
                  `[commands] Scene created: "${createBody.chatName}" (${createBody.chatId}) from chat ${input.chatId}`,
                );
              }
            } catch (sceneErr) {
              logger.error(sceneErr, "[commands] Scene creation failed");
            }
          }

          // ── Assistant commands (Professor Mari) ──
          if (command.type === "create_persona") {
            const cpCmd = command as CreatePersonaCommand;
            try {
              const persona = await chars.createPersona(cpCmd.name, cpCmd.description ?? "", undefined, {
                personality: cpCmd.personality,
                appearance: cpCmd.appearance,
              });
              reply.raw.write(
                `data: ${JSON.stringify({
                  type: "assistant_action",
                  data: { action: "persona_created", id: persona?.id, name: cpCmd.name },
                })}\n\n`,
              );
              logger.info(`[commands] Assistant created persona: "${cpCmd.name}" (${persona?.id})`);
            } catch (err) {
              logger.error(err, "[commands] Create persona failed");
            }
          }

          if (command.type === "create_character") {
            const ccCmd = command as CreateCharacterCommand;
            try {
              const charData = {
                name: ccCmd.name,
                description: ccCmd.description ?? "",
                personality: ccCmd.personality ?? "",
                first_mes: ccCmd.firstMessage ?? "",
                scenario: ccCmd.scenario ?? "",
                mes_example: ccCmd.mesExample ?? "",
                creator_notes: ccCmd.creatorNotes ?? "",
                system_prompt: ccCmd.systemPrompt ?? "",
                post_history_instructions: ccCmd.postHistoryInstructions ?? "",
                tags: ccCmd.tags ?? ([] as string[]),
                creator: ccCmd.creator ?? "",
                character_version: ccCmd.characterVersion ?? "",
                alternate_greetings: ccCmd.alternateGreetings ?? ([] as string[]),
                extensions: {
                  talkativeness: ccCmd.talkativeness ?? 0.5,
                  fav: ccCmd.fav ?? false,
                  world: ccCmd.world ?? "",
                  depth_prompt: {
                    prompt: ccCmd.depthPrompt ?? "",
                    depth: ccCmd.depthPromptDepth ?? 4,
                    role: ccCmd.depthPromptRole ?? "system",
                  },
                  backstory: ccCmd.backstory ?? "",
                  appearance: ccCmd.appearance ?? "",
                  altDescriptions: [],
                },
                character_book: null,
              };
              const created = await chars.create(charData as any);
              if (created) {
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "assistant_action",
                    data: { action: "character_created", id: created.id, name: ccCmd.name },
                  })}\n\n`,
                );
                logger.info(`[commands] Assistant created character: "${ccCmd.name}" (${created.id})`);
              }
            } catch (err) {
              logger.error(err, "[commands] Create character failed");
            }
          }

          if (command.type === "update_character") {
            const ucCmd = command as UpdateCharacterCommand;
            try {
              const allCharsList = await chars.list();
              const targetChar = allCharsList.find((c: any) => {
                const d = typeof c.data === "string" ? JSON.parse(c.data) : c.data;
                return d.name?.toLowerCase() === ucCmd.name.toLowerCase();
              });
              if (targetChar) {
                const latestTargetChar = await chars.getById(targetChar.id);
                if (!latestTargetChar) {
                  logger.warn(`[commands] Update character: "${ucCmd.name}" disappeared before update`);
                  continue;
                }
                const existingData =
                  typeof latestTargetChar.data === "string"
                    ? JSON.parse(latestTargetChar.data as string)
                    : latestTargetChar.data;
                const updates: Record<string, unknown> = {};
                const extensionUpdates: Record<string, unknown> = {};
                if (ucCmd.description !== undefined) updates.description = ucCmd.description;
                if (ucCmd.personality !== undefined) updates.personality = ucCmd.personality;
                if (ucCmd.firstMessage !== undefined) updates.first_mes = ucCmd.firstMessage;
                if (ucCmd.scenario !== undefined) updates.scenario = ucCmd.scenario;
                if (ucCmd.mesExample !== undefined) updates.mes_example = ucCmd.mesExample;
                if (ucCmd.creatorNotes !== undefined) updates.creator_notes = ucCmd.creatorNotes;
                if (ucCmd.systemPrompt !== undefined) updates.system_prompt = ucCmd.systemPrompt;
                if (ucCmd.postHistoryInstructions !== undefined) {
                  updates.post_history_instructions = ucCmd.postHistoryInstructions;
                }
                if (ucCmd.creator !== undefined) updates.creator = ucCmd.creator;
                if (ucCmd.characterVersion !== undefined) updates.character_version = ucCmd.characterVersion;
                if (ucCmd.tags !== undefined) updates.tags = ucCmd.tags;
                if (ucCmd.alternateGreetings !== undefined) {
                  updates.alternate_greetings = ucCmd.alternateGreetings;
                }
                if (ucCmd.backstory !== undefined) extensionUpdates.backstory = ucCmd.backstory;
                if (ucCmd.appearance !== undefined) extensionUpdates.appearance = ucCmd.appearance;
                if (ucCmd.talkativeness !== undefined) extensionUpdates.talkativeness = ucCmd.talkativeness;
                if (ucCmd.fav !== undefined) extensionUpdates.fav = ucCmd.fav;
                if (ucCmd.world !== undefined) extensionUpdates.world = ucCmd.world;
                if (
                  ucCmd.depthPrompt !== undefined ||
                  ucCmd.depthPromptDepth !== undefined ||
                  ucCmd.depthPromptRole !== undefined
                ) {
                  const existingDepthPrompt = existingData.extensions?.depth_prompt ?? {};
                  extensionUpdates.depth_prompt = {
                    ...existingDepthPrompt,
                    ...(ucCmd.depthPrompt !== undefined ? { prompt: ucCmd.depthPrompt } : {}),
                    ...(ucCmd.depthPromptDepth !== undefined ? { depth: ucCmd.depthPromptDepth } : {}),
                    ...(ucCmd.depthPromptRole !== undefined ? { role: ucCmd.depthPromptRole } : {}),
                  };
                }
                if (Object.keys(extensionUpdates).length > 0) {
                  updates.extensions = { ...(existingData.extensions ?? {}), ...extensionUpdates };
                }
                if (ucCmd.characterVersion === undefined && Object.keys(updates).length > 0) {
                  updates.character_version = bumpCharacterVersion(existingData.character_version);
                }
                await chars.update(targetChar.id, updates, undefined, {
                  versionSource: "command",
                  versionReason: "Assistant update_character command",
                });
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "assistant_action",
                    data: { action: "character_updated", id: targetChar.id, name: ucCmd.name },
                  })}\n\n`,
                );
                logger.info(`[commands] Assistant updated character: "${ucCmd.name}" (${targetChar.id})`);
              } else {
                logger.warn(`[commands] Update character: "${ucCmd.name}" not found`);
              }
            } catch (err) {
              logger.error(err, "[commands] Update character failed");
            }
          }

          if (command.type === "update_persona") {
            const upCmd = command as UpdatePersonaCommand;
            try {
              const allPersonas = await chars.listPersonas();
              const targetPersona = allPersonas.find((p: any) => {
                return p.name?.toLowerCase() === upCmd.name.toLowerCase();
              });
              if (targetPersona) {
                const sets: Record<string, unknown> = {};
                if (upCmd.description !== undefined) sets.description = upCmd.description;
                if (upCmd.personality !== undefined) sets.personality = upCmd.personality;
                if (upCmd.appearance !== undefined) sets.appearance = upCmd.appearance;
                if (upCmd.scenario !== undefined) sets.scenario = upCmd.scenario;
                if (upCmd.backstory !== undefined) sets.backstory = upCmd.backstory;
                await chars.updatePersona(targetPersona.id, sets as any);
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "assistant_action",
                    data: { action: "persona_updated", id: targetPersona.id, name: upCmd.name },
                  })}\n\n`,
                );
                logger.info(`[commands] Assistant updated persona: "${upCmd.name}" (${targetPersona.id})`);
              } else {
                logger.warn(`[commands] Update persona: "${upCmd.name}" not found`);
              }
            } catch (err) {
              logger.error(err, "[commands] Update persona failed");
            }
          }

          if (command.type === "create_lorebook") {
            const clCmd = command as CreateLorebookCommand;
            try {
              const category =
                clCmd.category === "character" ||
                clCmd.category === "world" ||
                clCmd.category === "npc" ||
                clCmd.category === "spellbook"
                  ? clCmd.category
                  : "uncategorized";
              const created = await lorebooksStore.create({
                name: clCmd.name,
                description: clCmd.description ?? "",
                category,
                tags: clCmd.tags ?? [],
                enabled: true,
                generatedBy: "agent",
                sourceAgentId: PROFESSOR_MARI_ID,
              });

              if (created) {
                const createdLorebook = created as unknown as { id: string };
                let entryCount = 0;
                for (const entry of clCmd.entries ?? []) {
                  await lorebooksStore.createEntry({
                    lorebookId: createdLorebook.id,
                    name: entry.name,
                    content: entry.content ?? "",
                    description: entry.description ?? "",
                    keys: entry.keys ?? [],
                    secondaryKeys: entry.secondaryKeys ?? [],
                    tag: entry.tag ?? "",
                    constant: entry.constant ?? false,
                    selective: entry.selective ?? false,
                    enabled: true,
                  });
                  entryCount += 1;
                }

                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "assistant_action",
                    data: {
                      action: "lorebook_created",
                      id: createdLorebook.id,
                      name: clCmd.name,
                      entryCount,
                    },
                  })}\n\n`,
                );
                logger.info(
                  '[commands] Assistant created lorebook: "%s" (%s) with %d entries',
                  clCmd.name,
                  createdLorebook.id,
                  entryCount,
                );
              }
            } catch (err) {
              logger.error(err, "[commands] Create lorebook failed");
            }
          }

          if (command.type === "update_lorebook") {
            const ulCmd = command as UpdateLorebookCommand;
            try {
              const allLorebooks = await lorebooksStore.list();
              const targetLorebook = (allLorebooks as any[]).find((lb: any) => {
                if (lb.id === ulCmd.name) return true;
                return lb.name?.toLowerCase() === ulCmd.name.toLowerCase();
              });

              if (!targetLorebook) {
                logger.warn('[commands] Update lorebook: "%s" not found', ulCmd.name);
              } else {
                const category =
                  ulCmd.category === "character" ||
                  ulCmd.category === "world" ||
                  ulCmd.category === "npc" ||
                  ulCmd.category === "spellbook" ||
                  ulCmd.category === "uncategorized"
                    ? ulCmd.category
                    : undefined;
                const lorebookUpdates: Record<string, unknown> = {};
                if (ulCmd.newName !== undefined && ulCmd.newName.trim()) lorebookUpdates.name = ulCmd.newName;
                if (ulCmd.description !== undefined) lorebookUpdates.description = ulCmd.description;
                if (category !== undefined) lorebookUpdates.category = category;
                if (ulCmd.tags !== undefined) lorebookUpdates.tags = ulCmd.tags;
                if (Object.keys(lorebookUpdates).length > 0) {
                  await lorebooksStore.update(targetLorebook.id, lorebookUpdates as any);
                }

                const existingEntries = (await lorebooksStore.listEntries(targetLorebook.id)) as any[];
                const existingByName = new Map(
                  existingEntries.map((entry) => [
                    String(entry.name ?? "")
                      .trim()
                      .toLowerCase(),
                    entry,
                  ]),
                );
                let updatedEntryCount = 0;
                let createdEntryCount = 0;

                for (const entry of ulCmd.entries ?? []) {
                  const matchName = (entry.matchName || entry.name).trim().toLowerCase();
                  const existingEntry = existingByName.get(matchName);
                  if (existingEntry) {
                    const entryUpdates: Record<string, unknown> = {};
                    if (entry.name !== undefined) entryUpdates.name = entry.name;
                    if (entry.content !== undefined) entryUpdates.content = entry.content;
                    if (entry.description !== undefined) entryUpdates.description = entry.description;
                    if (entry.keys !== undefined) entryUpdates.keys = entry.keys;
                    if (entry.secondaryKeys !== undefined) entryUpdates.secondaryKeys = entry.secondaryKeys;
                    if (entry.tag !== undefined) entryUpdates.tag = entry.tag;
                    if (entry.constant !== undefined) entryUpdates.constant = entry.constant;
                    if (entry.selective !== undefined) entryUpdates.selective = entry.selective;
                    if (Object.keys(entryUpdates).length > 0) {
                      const updatedEntry = await lorebooksStore.updateEntry(
                        existingEntry.id,
                        entryUpdates as any,
                      );
                      if (updatedEntry) {
                        updatedEntryCount += 1;
                        existingByName.delete(matchName);
                        existingByName.set(entry.name.trim().toLowerCase(), updatedEntry);
                      }
                    }
                  } else {
                    const createdEntry = await lorebooksStore.createEntry({
                      lorebookId: targetLorebook.id,
                      name: entry.name,
                      content: entry.content ?? "",
                      description: entry.description ?? "",
                      keys: entry.keys ?? [],
                      secondaryKeys: entry.secondaryKeys ?? [],
                      tag: entry.tag ?? "",
                      constant: entry.constant ?? false,
                      selective: entry.selective ?? false,
                      enabled: true,
                    });
                    if (createdEntry) {
                      createdEntryCount += 1;
                      existingByName.set(entry.name.trim().toLowerCase(), createdEntry);
                    }
                  }
                }

                const finalName = ulCmd.newName?.trim() || targetLorebook.name || ulCmd.name;
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "assistant_action",
                    data: {
                      action: "lorebook_updated",
                      id: targetLorebook.id,
                      name: finalName,
                      updatedEntryCount,
                      createdEntryCount,
                    },
                  })}\n\n`,
                );
                logger.info(
                  '[commands] Assistant updated lorebook: "%s" (%s), entries updated=%d created=%d',
                  finalName,
                  targetLorebook.id,
                  updatedEntryCount,
                  createdEntryCount,
                );
              }
            } catch (err) {
              logger.error(err, "[commands] Update lorebook failed");
            }
          }

          if (command.type === "create_chat") {
            const ctCmd = command as CreateChatCommand;
            try {
              // Resolve character by name or ID
              const allCharsList = await chars.list();
              const targetChar = allCharsList.find((c: any) => {
                if (c.id === ctCmd.character) return true;
                const d = typeof c.data === "string" ? JSON.parse(c.data) : c.data;
                return d.name?.toLowerCase() === ctCmd.character.toLowerCase();
              });
              if (targetChar) {
                const targetData =
                  typeof targetChar.data === "string" ? JSON.parse(targetChar.data as string) : targetChar.data;
                const mode = ctCmd.mode ?? "conversation";
                const newChat = await chats.create({
                  name: `Chat with ${targetData.name}`,
                  mode,
                  characterIds: [targetChar.id],
                  groupId: null,
                  personaId: null,
                  promptPresetId: null,
                  connectionId: null,
                });
                if (newChat) {
                  reply.raw.write(
                    `data: ${JSON.stringify({
                      type: "assistant_action",
                      data: {
                        action: "chat_created",
                        chatId: newChat.id,
                        chatName: newChat.name ?? `Chat with ${targetData.name}`,
                        mode,
                        characterName: targetData.name,
                      },
                    })}\n\n`,
                  );
                  logger.info(
                    `[commands] Assistant created ${mode} chat with "${targetData.name}" (${newChat.id})`,
                  );
                }
              } else {
                logger.warn(`[commands] Create chat: character "${ctCmd.character}" not found`);
              }
            } catch (err) {
              logger.error(err, "[commands] Create chat failed");
            }
          }

          if (command.type === "navigate") {
            const navCmd = command as NavigateCommand;
            reply.raw.write(
              `data: ${JSON.stringify({
                type: "assistant_action",
                data: { action: "navigate", panel: navCmd.panel, tab: navCmd.tab ?? null },
              })}\n\n`,
            );
            logger.info(`[commands] Assistant navigate: panel=${navCmd.panel}, tab=${navCmd.tab ?? "none"}`);
          }

          // ── Fetch command (Professor Mari) ──
          if (command.type === "fetch") {
            const fetchCmd = command as FetchCommand;
            try {
              let fetchedContent = "";
              const contextKey = `${fetchCmd.fetchType}:${fetchCmd.name}`;

              if (fetchCmd.fetchType === "character") {
                const allCharsList = await chars.list();
                const found = allCharsList.find((c: any) => {
                  const d = typeof c.data === "string" ? JSON.parse(c.data) : c.data;
                  return d.name?.toLowerCase() === fetchCmd.name.toLowerCase();
                });
                if (found) {
                  const d = typeof found.data === "string" ? JSON.parse(found.data as string) : found.data;
                  const parts = [`Name: ${d.name}`];
                  if (d.description) parts.push(`Description: ${d.description}`);
                  if (d.personality) parts.push(`Personality: ${d.personality}`);
                  if (d.scenario) parts.push(`Scenario: ${d.scenario}`);
                  if (d.mes_example) parts.push(`Example Messages: ${d.mes_example}`);
                  if (d.system_prompt) parts.push(`System Prompt: ${d.system_prompt}`);
                  if (d.post_history_instructions) {
                    parts.push(`Post-History Instructions: ${d.post_history_instructions}`);
                  }
                  if (d.first_mes) parts.push(`First Message: ${d.first_mes}`);
                  if (d.creator_notes) parts.push(`Creator Notes: ${d.creator_notes}`);
                  if (d.extensions?.appearance) parts.push(`Appearance: ${d.extensions.appearance}`);
                  if (d.extensions?.backstory) parts.push(`Backstory: ${d.extensions.backstory}`);
                  fetchedContent = parts.join("\n");
                }
              } else if (fetchCmd.fetchType === "persona") {
                const allPersonasList = await chars.listPersonas();
                const found = allPersonasList.find(
                  (p: any) => p.name?.toLowerCase() === fetchCmd.name.toLowerCase(),
                );
                if (found) {
                  const parts = [`Name: ${found.name}`];
                  if (found.description) parts.push(`Description: ${found.description}`);
                  if (found.personality) parts.push(`Personality: ${found.personality}`);
                  if (found.scenario) parts.push(`Scenario: ${found.scenario}`);
                  if (found.appearance) parts.push(`Appearance: ${found.appearance}`);
                  if (found.backstory) parts.push(`Backstory: ${found.backstory}`);
                  fetchedContent = parts.join("\n");
                }
              } else if (fetchCmd.fetchType === "lorebook") {
                const allLorebooks = await lorebooksStore.list();
                const found = (allLorebooks as any[]).find(
                  (lb: any) => lb.name?.toLowerCase() === fetchCmd.name.toLowerCase(),
                );
                if (found) {
                  const entries = await lorebooksStore.listEntries(found.id);
                  const parts = [`Lorebook: ${found.name}`];
                  if (found.description) parts.push(`Description: ${found.description}`);
                  if (found.category) parts.push(`Category: ${found.category}`);
                  parts.push(`Entries (${entries.length}):`);
                  for (const entry of entries as any[]) {
                    parts.push(
                      `\n  Entry: ${entry.name}\n  Keys: ${(Array.isArray(entry.keys) ? entry.keys : []).join(", ")}\n  Content: ${entry.content}`,
                    );
                  }
                  fetchedContent = parts.join("\n");
                }
              } else if (fetchCmd.fetchType === "chat") {
                const allChats = await chats.list();
                const found = (allChats as any[]).find(
                  (c: any) => c.name?.toLowerCase() === fetchCmd.name.toLowerCase(),
                );
                if (found) {
                  const parts = [`Chat: ${found.name}`, `Mode: ${found.mode}`];
                  const recentMsgs = await chats.listMessagesPaginated(found.id, 20);
                  if (recentMsgs.length > 0) {
                    parts.push(`Recent Messages (${recentMsgs.length}):`);
                    for (const msg of recentMsgs) {
                      const role =
                        msg.role === "assistant" ? (msg.characterId ? "Character" : "Assistant") : "User";
                      parts.push(`  [${role}]: ${(msg.content as string).slice(0, 300)}`);
                    }
                  }
                  fetchedContent = parts.join("\n");
                }
              } else if (fetchCmd.fetchType === "preset") {
                const allPresetsList = await presets.list();
                const found = (allPresetsList as any[]).find(
                  (p: any) => p.name?.toLowerCase() === fetchCmd.name.toLowerCase(),
                );
                if (found) {
                  const sections = await presets.listSections(found.id);
                  const parts = [`Preset: ${found.name}`];
                  if (found.description) parts.push(`Description: ${found.description}`);
                  parts.push(`Sections (${sections.length}):`);
                  for (const sec of sections) {
                    parts.push(
                      `  [${sec.role}] ${sec.name ?? "Untitled"}: ${(sec.content as string).slice(0, 200)}`,
                    );
                  }
                  fetchedContent = parts.join("\n");
                }
              }

              if (fetchedContent) {
                // Persist to chatMeta.mariContext so it's available in subsequent messages.
                // Re-fetch fresh metadata so concurrent writes (e.g. /game/start) aren't clobbered.
                const freshChat = await chats.getById(input.chatId);
                const currentMeta = freshChat
                  ? (parseExtra(freshChat.metadata) as Record<string, unknown>)
                  : (parseExtra(chat.metadata) as Record<string, unknown>);
                const mariContext = (currentMeta.mariContext as Record<string, string>) ?? {};
                mariContext[contextKey] = fetchedContent;
                currentMeta.mariContext = mariContext;
                await chats.updateMetadata(input.chatId, currentMeta);

                // Record success for the follow-up trigger, but only when
                // the fetch came from Mari (or a Mari-included chat). The
                // follow-up loop gates on this so a missed/errored fetch
                // doesn't burn another generation pass.
                if (
                  characterId === PROFESSOR_MARI_ID ||
                  (characterId === null && characterIds.includes(PROFESSOR_MARI_ID))
                ) {
                  mariFetchSucceeded = true;
                }

                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "assistant_action",
                    data: {
                      action: "data_fetched",
                      fetchType: fetchCmd.fetchType,
                      name: fetchCmd.name,
                    },
                  })}\n\n`,
                );
                logger.info(`[commands] Assistant fetched ${fetchCmd.fetchType}: "${fetchCmd.name}"`);
              } else {
                logger.warn(`[commands] Fetch: ${fetchCmd.fetchType} "${fetchCmd.name}" not found`);
              }
            } catch (err) {
              logger.error(err, "[commands] Fetch failed");
            }
          }
        } catch (cmdErr) {
          logger.error(cmdErr, `[commands] Error processing ${command.type} command`);
        }
      }
    } finally {
      trySendSseEvent(reply, {
        type: "assistant_commands_end",
        data: {},
      });
    }
  }

  return { mariFetchSucceeded };
}
