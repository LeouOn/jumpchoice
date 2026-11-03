# Render This Moment

Turn the current scene of a campaign into one pixel-art illustration of your
companion, and see the exact prompt, model, reference image and cost before
anything is sent.

This is a fork feature. It is specific to JumpChoice and is not part of
upstream Marinara Engine. It works in Game chats (CYOA campaigns) and
Roleplay chats.

## How to use it

1. Open the chat's **Gallery** and press **Render this moment**.
2. Choose a **Style**, the **Companion**, and a **Format**:
   - **Desktop 16:9**: a wide scene with the companion in the left or right third.
   - **Phone 9:16**: a vertical scene with the companion in the middle third.
3. Write the **Scene**, or press **Draft from chat**. Draft from chat asks the
   chat's text model to describe the last 8 messages as one paragraph. This is a
   small text request. No image is made. You can edit the draft, or skip it and
   type your own scene.
4. Press **Preview prompt**. Nothing is sent to the image provider at this step.
   The review screen shows:
   - the **exact prompt**, which you can edit;
   - the **model** and the **connection**;
   - the **aspect ratio** and size;
   - the **reference image** that will be attached (or a note that none will be);
   - the **estimated cost**, and how much you have spent today and in total against your caps.
5. Press **Confirm and render** to send exactly the text in the box, or
   **Back**/**Cancel** to send nothing.

The review step always appears, whether or not "Expose media prompts before
sending" is on in Settings.

Your style, custom style text, format and companion are remembered for each chat.

The finished image is saved to the chat gallery together with its prompt.
Hover over any gallery image and press **Show prompt** (the scroll icon) to read
the full prompt again.

## How the prompt is built

The prompt has these blocks, in this order, with a blank line between them:

1. **Style**: one of the built-in presets (*Classic pixel*, *Hi-bit anime*,
   *Pixel pointillism*) or your own **Custom** text.
2. **Character**: the character's **Moment card** (Character editor →
   Character card → Moment card, under Appearance), or their **Appearance** if the Moment card
   is blank. The text is sent exactly as written.
3. **Format**: the 16:9 or 9:16 composition block.
4. **Scene**: your scene paragraph.
5. **Rules**: the viewer is not shown, every person has two arms and two hands,
   the companion looks at the viewer, no readable text, and nobody resembles a
   real, famous person.
6. **Reference line**: "Keep her face, hair and colouring consistent with the
   attached reference image." This line is added only when a reference image is attached.

The reference image is the companion's character sheet if "use as reference" is
on, otherwise her avatar, otherwise a full-body sprite.

## Spending cap

Moments are paid image requests. The caps are checked on the server before
**every** render, so a bug in the page cannot get past them.

Set them in **Settings → Generations → Image Generation → Moments**:

| Setting | Default | What it does |
| --- | --- | --- |
| Image model | `google/gemini-nano-banana-2.1` | The model sent for moments. Leave it blank to use the connection's own model. |
| Image connection | Chat or default Images connection | The image connection to use. |
| Daily cap | $2 | Refuses a render if today's moment spend plus the estimate would go over the cap. |
| Total cap | $20 | Refuses a render if all-time moment spend plus the estimate would go over the cap. |
| OpenRouter account usage ceiling | Off | If set, each render first reads your OpenRouter account's total usage. It refuses when usage plus the estimate reaches the ceiling. If the check fails, nothing is sent. |

Each render is estimated at **$0.05**. This estimate is deliberately cautious.

- **Before the call**, a pending claim at the estimate is saved to disk.
- **After the call**, the claim is settled with the cost that OpenRouter reports for
  the request (`usage.cost`). If no cost is reported, the estimate is kept.
- **Failed or interrupted renders** keep counting at the estimate. A provider may
  still bill a request that failed on our side, so a failure never gives budget back.
  A crash in the middle of a render has the same result.
- **Only one moment renders at a time.** A second click while a render is in
  progress is refused, so double clicks cannot spend twice.
- **Deleting a chat does not reset the spend.**

A refused render shows its reason in the dialog, and nothing is sent.

Moments never fall back to a backup image connection. A moment is only sent to
the connection you saw in the review.

## Debug mode

With **Debug mode** on (Settings → Advanced) or `DEBUG_AGENTS=true`, the server
logs the final moment prompt and the OpenRouter request body. Reference images are replaced
with placeholders in that log. API keys are never logged.
