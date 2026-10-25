"""Render localized, vertical walkthroughs from private-data-free native captures."""

import argparse
import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "media" / "native"
OUT = ROOT / "media" / "video"
OUT.mkdir(parents=True, exist_ok=True)
FONT = "C:/Windows/Fonts/segoeui.ttf"
BOLD = "C:/Windows/Fonts/segoeuib.ttf"
W, H = 1080, 1920


def run(*args):
    subprocess.run(args, check=True, capture_output=True)


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True, capture_output=True, text=True,
    )
    return float(result.stdout.strip())


async def speak(text, voice, path):
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate="-4%").save(str(path))
            if path.stat().st_size > 1000:
                return
        except Exception:
            if attempt == 2:
                raise
        await asyncio.sleep(2 + attempt * 2)
    raise RuntimeError(f"No audio for {path}")


def wrap(draw, text, font, width):
    lines, current = [], ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=font)[2] > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def stage(scene, index, total, language, path):
    image = Image.open(SOURCE / f"{language}-{scene['image']}.png").convert("RGB")
    crop_y = int(scene.get("crop_y", 100))
    if image.width != W:
        image = image.resize((W, round(image.height * W / image.width)), Image.Resampling.LANCZOS)
    crop_y = max(0, min(crop_y, image.height - H))
    image = image.crop((0, crop_y, W, crop_y + H))
    focus = scene.get("focus")
    if focus:
        x, y, w, h = focus
        y -= crop_y
        shade = Image.new("RGBA", image.size, (6, 22, 34, 96))
        hole = Image.new("L", image.size, 255)
        hd = ImageDraw.Draw(hole)
        hd.rounded_rectangle((x - 14, y - 14, x + w + 14, y + h + 14), radius=30, fill=0)
        shade.putalpha(Image.composite(shade.getchannel("A"), Image.new("L", image.size), hole))
        image = Image.alpha_composite(image.convert("RGBA"), shade)
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((x - 14, y - 14, x + w + 14, y + h + 14), radius=30, outline="#37B9CF", width=9)
        draw.ellipse((x + w - 10, y + h - 10, x + w + 28, y + h + 28), fill="#37B9CF", outline="white", width=4)
    else:
        image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 22, 1052, 202), radius=24, fill=(24, 44, 60, 236))
    draw.text((66, 50), f"{index:02d} / {total:02d}   ROOMORA", font=ImageFont.truetype(BOLD, 33), fill="#A6D7E8")
    title_font = ImageFont.truetype(BOLD, 58)
    for i, line in enumerate(wrap(draw, scene["title"], title_font, 930)[:2]):
        draw.text((66, 100 + i * 61), line, font=title_font, fill="white")
    if scene.get("hint"):
        hint_font = ImageFont.truetype(BOLD, 35)
        hint_lines = wrap(draw, scene["hint"], hint_font, 914)
        box_h = 55 + len(hint_lines) * 47
        top = H - box_h - 35
        draw.rounded_rectangle((28, top, 1052, H - 35), radius=22, fill=(255, 255, 255, 244))
        for i, line in enumerate(hint_lines):
            draw.text((66, top + 25 + i * 47), line, font=hint_font, fill="#182C3C")
    image.convert("RGB").save(path, quality=96)


async def main(language):
    scenes = json.loads((SOURCE / f"guide-{language}.json").read_text(encoding="utf-8"))
    turkish_voice = None
    if language == "tr":
        from ema_lightning import EMA
        turkish_voice = EMA(device="cpu")
    clips = []
    for index, scene in enumerate(scenes, 1):
        prefix = OUT / f"native-{language}-{index:02d}"
        still = prefix.with_suffix(".jpg")
        audio = prefix.with_suffix(".wav" if language == "tr" else ".mp3")
        clip = prefix.with_suffix(".mp4")
        stage(scene, index, len(scenes), language, still)
        if turkish_voice:
            turkish_voice.say(scene["narration"], path=str(audio), speed=0.98)
        else:
            await speak(scene["narration"], "en-US-JennyNeural", audio)
        seconds = duration(audio) + 0.8
        run("ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "24", "-i", str(still),
            "-i", str(audio), "-t", str(seconds), "-vf", f"zoompan=z='min(zoom+0.0001,1.02)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=24,fade=t=in:st=0:d=0.3,fade=t=out:st={seconds-0.4}:d=0.4",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-af", "apad", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", str(clip))
        clips.append(clip)
    manifest = OUT / f"native-{language}-concat.txt"
    manifest.write_text("".join(f"file '{clip.as_posix()}'\n" for clip in clips), encoding="utf-8")
    final = OUT / f"roomora-native-guide-{language}.mp4"
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(manifest),
        "-c", "copy", "-movflags", "+faststart", str(final))
    for index in range(1, len(scenes) + 1):
        prefix = OUT / f"native-{language}-{index:02d}"
        for suffix in (".jpg", ".wav" if language == "tr" else ".mp3", ".mp4"):
            prefix.with_suffix(suffix).unlink()
    manifest.unlink()
    print(final)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("language", choices=("tr", "en"))
    args = parser.parse_args()
    asyncio.run(main(args.language))
