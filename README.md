# СПГfoto — full-stack starter

Мобильная фотобаза транспорта на Next.js + Supabase.

## Что уже предусмотрено
- Регистрация и вход по email/паролю
- Загрузка фото с телефона в Supabase Storage
- Общая галерея опубликованных фотографий
- Поиск и фильтр по категориям
- Очередь модерации для администратора
- Карточки с моделью, номером, городом и датой съёмки
- Адаптивная вёрстка

## Важно
Это исходный проект, а не уже опубликованный сайт. Чтобы он стал доступен всем по ссылке, нужно создать проект Supabase и задеплоить приложение на Vercel (или другой Node-хостинг).

## Настройка Supabase
1. Создай проект на https://supabase.com/
2. Открой SQL Editor и выполни `supabase/schema.sql`.
3. В Authentication → Providers включи Email.
4. В Authentication → URL Configuration добавь домен сайта после публикации.
5. В SQL Editor добавь email владельца:
   `insert into public.site_admins(email) values ('ТВОЙ_EMAIL');`
6. Скопируй Project URL и anon/public key из Project Settings → API.
7. Скопируй `.env.example` в `.env.local` и заполни значения.
8. В `NEXT_PUBLIC_ADMIN_EMAIL` укажи тот же email администратора.

## Запуск локально
Требуется Node.js 20+.
```bash
npm install
npm run dev
```
Открой http://localhost:3000

## Публикация
1. Загрузи папку проекта в новый GitHub repository.
2. Импортируй репозиторий в https://vercel.com/
3. Добавь переменные из `.env.example` в Vercel → Project Settings → Environment Variables.
4. Нажми Deploy.
5. Добавь выданный домен в Supabase Auth → URL Configuration.

## Безопасность перед запуском
- Используй уникальный пароль владельца и включи подтверждение email.
- Не добавляй Supabase service-role key в `.env` с префиксом `NEXT_PUBLIC_` и никогда не отправляй его в браузер.
- Для серьёзной публичной эксплуатации добавь серверную проверку ролей администратора, лимиты загрузок, CAPTCHA/антиспам, отчёты о нарушениях и резервное копирование.
- Сейчас удаление файлов и полноценное управление профилями/комментариями не реализованы.
