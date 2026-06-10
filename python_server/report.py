"""
Daily WhatsApp report formatter.
Python receives raw user data from Next.js (which fetched from DB),
formats the message using template + random quote, returns ready-to-send strings.
"""

import random
import re

QUOTES = [
    "सपने वो नहीं जो हम सोते वक्त देखते हैं, सपने वो हैं जो हमें सोने नहीं देते। — A.P.J. Abdul Kalam",
    "कठिनाइयाँ वो होती हैं जो आपको तब दिखती हैं जब आप अपने लक्ष्य से नजर हटा लेते हैं। — Henry Ford",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
    "The secret of getting ahead is getting started. — Mark Twain",
    "Don't watch the clock; do what it does — keep going. — Sam Levenson",
    "पढ़ोगे-लिखोगे तो बनोगे नवाब। — Loksaying",
    "Hard work beats talent when talent doesn't work hard. — Tim Notke",
    "जो कोशिश करना नहीं छोड़ते, वो जीतते ज़रूर हैं। — Anonymous",
    "Believe you can and you're halfway there. — Theodore Roosevelt",
    "एक छोटा कदम रोज़ उठाओ, मंज़िल खुद पास आ जाएगी। — Anonymous",
    "Your future is created by what you do today, not tomorrow. — Robert Kiyosaki",
    "Study not to know more, but to become more. — Anonymous",
    "हर रात के बाद एक सुबह ज़रूर आती है। बस टिके रहो। — Anonymous",
    "The more you read, the more things you will know. — Dr. Seuss",
    "It always seems impossible until it's done. — Nelson Mandela",
    "मेहनत इतनी खामोशी से करो कि सफलता शोर मचा दे। — Anonymous",
    "Don't stop when you're tired, stop when you're done. — Anonymous",
    "जिंदगी में कुछ बड़ा करना है तो आराम से दोस्ती मत करो। — Anonymous",
    "Education is the most powerful weapon you can use to change the world. — Nelson Mandela",
    "Push yourself, because no one else is going to do it for you. — Anonymous",
]

DEFAULT_TEMPLATE = """\
🎓 *Let's Study — Daily Report*

Hello *{{name}}*! 👋

Here's your performance for today — great work! 💪

📚 *Study Time:* {{studyHours}} hrs ({{studyMins}} min)
✅ *Tasks Done:* {{tasksCompleted}} / {{totalTasks}}
🔥 *Streak:* {{streak}} days
🪙 *Coins Today:* +{{coinsToday}} (Balance: {{coins}})

💬 *Quote of the Day:*
_{{quote}}_

Consistency is the road to success. Do even better tomorrow! 🚀

— Let's Study Team"""


def _fill(template: str, variables: dict) -> str:
    """Replace {{key}} placeholders with values."""
    for key, val in variables.items():
        template = re.sub(r'\{\{' + re.escape(key) + r'\}\}', str(val), template)
    return template


def format_report(user: dict, template: str | None = None) -> str:
    """Format a single user's report message.

    user dict keys:
      name, phone, studyMins, tasksCompleted, totalTasks,
      streak, coins, coinsToday
    """
    tmpl = template or DEFAULT_TEMPLATE
    study_mins  = int(user.get("studyMins", 0))
    study_hours = f"{study_mins / 60:.1f}"

    return _fill(tmpl, {
        "name":           user.get("name") or "Student",
        "studyHours":     study_hours,
        "studyMins":      study_mins,
        "tasksCompleted": user.get("tasksCompleted", 0),
        "totalTasks":     user.get("totalTasks", 0),
        "streak":         user.get("streak", 0),
        "coins":          user.get("coins", 0),
        "coinsToday":     user.get("coinsToday", 0),
        "quote":          random.choice(QUOTES),
    })


def format_all_reports(users: list[dict], template: str | None = None) -> list[dict]:
    """Format reports for all users.

    Returns list of {phone, message, userId} — ready for Next.js to send via WhatsApp.
    """
    results = []
    for user in users:
        phone = user.get("phone", "").strip()
        if not phone:
            continue
        message = format_report(user, template)
        results.append({
            "phone":   phone,
            "message": message,
            "userId":  user.get("userId", ""),
        })
    return results
