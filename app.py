"""
Flask backend for BigQuery Release Notes viewer.
Fetches and parses the Atom feed from Google Cloud docs.
"""

import re
from flask import Flask, jsonify, render_template
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = "http://www.w3.org/2005/Atom"

# Map known release-note category headings to badge styles
CATEGORY_STYLES = {
    "feature": "feature",
    "announcement": "announcement",
    "breaking change": "breaking",
    "deprecated": "deprecated",
    "deprecation": "deprecated",
    "issue": "issue",
    "fixed": "fixed",
    "fix": "fixed",
    "security fix": "security",
    "security": "security",
    "changed": "changed",
    "libraries": "libraries",
    "preview": "preview",
}


def classify_category(heading: str) -> str:
    """Return a CSS class token for a release note category heading."""
    normalized = heading.strip().lower()
    return CATEGORY_STYLES.get(normalized, "other")


def parse_content_html(raw_html: str) -> list[dict]:
    """
    Parse the CDATA HTML content of a feed entry into a list of sections.
    Each section has a 'category' (h3 text) and 'body' (rendered HTML).
    """
    soup = BeautifulSoup(raw_html, "lxml")
    sections = []
    current_category = "Update"
    current_parts = []

    for element in soup.body.children if soup.body else soup.children:
        tag = getattr(element, "name", None)
        if tag == "h3":
            if current_parts:
                sections.append({
                    "category": current_category,
                    "category_class": classify_category(current_category),
                    "body": "".join(str(p) for p in current_parts),
                })
                current_parts = []
            current_category = element.get_text(strip=True)
        elif tag is not None:
            current_parts.append(element)

    if current_parts:
        sections.append({
            "category": current_category,
            "category_class": classify_category(current_category),
            "body": "".join(str(p) for p in current_parts),
        })

    return sections


def parse_feed(xml_text: str) -> list[dict]:
    """Parse the Atom XML feed and return a list of release note entry dicts."""
    root = ET.fromstring(xml_text)
    entries = []

    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        title_el = entry.find(f"{{{ATOM_NS}}}title")
        updated_el = entry.find(f"{{{ATOM_NS}}}updated")
        link_el = entry.find(f"{{{ATOM_NS}}}link[@rel='alternate']")
        content_el = entry.find(f"{{{ATOM_NS}}}content")

        title = title_el.text.strip() if title_el is not None else "Untitled"
        updated_raw = updated_el.text.strip() if updated_el is not None else ""
        link = link_el.attrib.get("href", "") if link_el is not None else ""
        raw_html = content_el.text or "" if content_el is not None else ""

        # Format the date nicely
        try:
            dt = datetime.fromisoformat(updated_raw)
            formatted_date = dt.strftime("%B %d, %Y")
        except Exception:
            formatted_date = updated_raw

        sections = parse_content_html(raw_html)

        entries.append({
            "title": title,
            "date": formatted_date,
            "date_raw": updated_raw,
            "link": link,
            "sections": sections,
        })

    return entries


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/release-notes")
def release_notes():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        entries = parse_feed(response.text)
        return jsonify({"ok": True, "entries": entries})
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
