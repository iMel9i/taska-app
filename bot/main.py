import asyncio
import logging
import os
from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, WebAppInfo, ReplyKeyboardMarkup, KeyboardButton
from aiogram.webhook.aiohttp_server import SimpleRequestHandler
from aiohttp import web
from pathlib import Path

# --------------------- Конфиг ---------------------
BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")  # Например https://taska-up.railway.app

if not BOT_TOKEN:
    raise ValueError("Укажи BOT_TOKEN в переменных окружения!")

# Папка со статикой фронтенда (куда Vite собирает build)
STATIC_PATH = Path(__file__).parent.parent / "Frontend" / "dist"
STATIC_PATH.mkdir(exist_ok=True)

# --------------------- Клавиатура ---------------------
def get_keyboard():
    if WEBAPP_URL:
        button = KeyboardButton(
            text="Открыть Таска",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
        return ReplyKeyboardMarkup(keyboard=[[button]], resize_keyboard=True, one_time_keyboard=False)
    return None

# --------------------- Хендлеры ---------------------
router = Router()

@router.message(F.text == "/start")
@router.message(F.text.lower().contains("таска") | F.text.lower().contains("задачи"))
async def cmd_start(message: Message):
    keyboard = get_keyboard()
    text = "Привет! Это Таска — твой групповой планировщик с матрицей Эйзенхауэра."
    
    if WEBAPP_URL:
        text += "\n\nНажми кнопку ниже и управляй задачами вместе с командой 👇"
    else:
        text += "\n\nВеб-приложение временно недоступно."
    
    await message.answer(text, reply_markup=keyboard)

# --------------------- Web-сервер (webhook + статика) ---------------------
async def on_startup(app: web.Application):
    if WEBAPP_URL:
        await bot.set_webhook(WEBAPP_URL + "/webhook")
        logging.info("Webhook установлен")

async def main():
    global bot
    logging.basicConfig(level=logging.INFO)

    bot = Bot(token=BOT_TOKEN, parse_mode="HTML")
    dp = Dispatcher()
    dp.include_router(router)

    app = web.Application()

    # Раздаём статику фронтенда (чтобы всё работало по одному домену)
    app.router.add_static("/static", STATIC_PATH, show_index=True)
    app.router.add_get("/", lambda req: web.FileResponse(STATIC_PATH / "index.html"))

    # Webhook для бота
    SimpleRequestHandler(dispatcher=dp, bot=bot).register(app, path="/webhook")
    app.on_startup.append(on_startup)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", int(os.getenv("PORT", 8000)))
    await site.start()

    print("Бот и веб-приложение запущены!")
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
