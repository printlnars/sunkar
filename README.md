# Sunkar AI (Сұңқар AI) 🦅🚨

Интеллектуальная система мониторинга, анализа происшествий и диспетчеризации экстренных служб в реальном времени.

## 🌟 Основные возможности

- **Интерактивная ситуационная карта**: Мониторинг дронов, патрулей, пожарных расчетов и карет скорой помощи с живой телеметрией.
- **AI-Аналитика инцидентов**: Мгновенный разбор ситуации с помощью нейросетевых моделей (оценка угрозы, приоритета и рекомендуемых мер).
- **Диспетчеризация и назначение служб**: Оперативное назначение свободных юнитов с расчетом времени прибытия (ETA).
- **Живые видеопотоки и телеметрия**: Просмотр камер с дронов и городских камер в режиме реального времени.
- **WebSocket синхронизация**: Мгновенное обновление статусов происшествий и перемещений отрядов.

---

## 🚀 Стек технологий

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, CSS3 Glassmorphism
- **Backend**: Python 3.10+, FastAPI, WebSockets, Pydantic, Uvicorn
- **AI Integration**: Google Gemini API / Heuristic AI Agent

---

## 🛠 Запуск проекта

### 1. Запуск Backend

```bash
cd backend
# Активация виртуального окружения
source ../venv/bin/activate  # или python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Запуск FastAPI сервера
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Запуск Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен по адресу: `http://localhost:5173`  
Backend API документация (Swagger): `http://localhost:8000/docs`
