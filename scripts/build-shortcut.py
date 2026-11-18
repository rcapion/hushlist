#!/usr/bin/env python3
"""Build the Hushlist Shortcut as an unsigned .shortcut file.

iOS imports only signed Shortcuts, so this file is signed once on a Mac:

    shortcuts sign --mode anyone --input Hushlist.shortcut --output hushlist.shortcut

and the signed copy goes in the data directory as hushlist.shortcut, where
Indstillinger offers it (docs/SHORTCUT.md). The file
holds no secret: the key is an import question, asked when it is added.

What it does, from the share sheet (URLs and Safari web pages):
  1. From Safari, read the page's head with JavaScript (shops that refuse our
     server, docs/DESIGN.md); from an app, only the link.
  2. GET /api/wishes → the lists the key may write to; ask which, if more than one.
  3. POST the link (and the head) to /api/wishes, and show the answer.

Usage: build-shortcut.py [--lang da|en] <origin> <output>

--lang picks the language of what the Shortcut says (default en).
"""
import argparse
import plistlib
import uuid

# Kept identical to SAFARI_SCRIPT in src/app/indstillinger/page.tsx.
SAFARI_SCRIPT = """var parts = [];
document.querySelectorAll('title, meta[property], meta[name], script[type="application/ld+json"]')
  .forEach(function (e) { parts.push(e.outerHTML); });
completion(parts.join("\\n"));"""

OBJ = "￼"  # where a variable sits inside a text field

# What the Shortcut says, per language. Danish keeps the app's Danish name.
TEXTS = {
    "da": {
        "name": "Ønskeliste",
        "whose_list": "Hvis liste?",
        "key_question": "Din nøgle fra Ønskeliste → Indstillinger → Genvej på iPhone",
    },
    "en": {
        "name": "Hushlist",
        "whose_list": "Whose list?",
        "key_question": "Your key from Hushlist → Settings → Wish from your iPhone",
    },
}


def output(uid, name):
    return {"Type": "ActionOutput", "OutputUUID": uid, "OutputName": name}


def attachment(var):
    return {"Value": var, "WFSerializationType": "WFTextTokenAttachment"}


def text(s, *vars):
    """Text with variables at each OBJ, in order."""
    by_range, pos = {}, 0
    for var in vars:
        pos = s.index(OBJ, pos)
        by_range[f"{{{pos}, 1}}"] = var
        pos += 1
    value = {"string": s}
    if by_range:
        value["attachmentsByRange"] = by_range
    return {"Value": value, "WFSerializationType": "WFTextTokenString"}


def fields(pairs):
    return {
        "Value": {
            "WFDictionaryFieldValueItems": [
                {"WFItemType": 0, "WFKey": text(k), "WFValue": v} for k, v in pairs
            ]
        },
        "WFSerializationType": "WFDictionaryFieldValue",
    }


def action(ident, uid=None, **params):
    if uid:
        params["UUID"] = uid
    return {"WFWorkflowActionIdentifier": f"is.workflow.actions.{ident}", "WFWorkflowActionParameters": params}


def condition(group, mode, uid=None, **params):
    return action("conditional", uid, GroupingIdentifier=group, WFControlFlowMode=mode, **params)


def build(origin, lang="en"):
    say = TEXTS[lang]
    api = f"{origin}/api/wishes"
    ids = {k: str(uuid.uuid4()).upper() for k in
           "key link type js ifsafari lists listnames count choose first ifmany post message".split()}
    g_safari, g_many = str(uuid.uuid4()).upper(), str(uuid.uuid4()).upper()
    shortcut_input = {"Type": "ExtensionInput"}
    key = output(ids["key"], "Text")
    auth = fields([("Authorization", text(f"Bearer {OBJ}", key))])

    actions = [
        # 0: the key, filled in by the import question.
        action("gettext", ids["key"], WFTextActionText=""),
        action("detect.link", ids["link"], WFInput=attachment(shortcut_input)),
        action("getitemtype", ids["type"], WFInput=attachment(shortcut_input)),
        # "Safari web page" / "Safari-webside": the word survives translation.
        condition(g_safari, 0, WFCondition=99, WFConditionalActionString="Safari",
                  WFInput={"Type": "Variable", "Variable": attachment(output(ids["type"], "Type"))}),
        action("runjavascriptonwebpage", ids["js"], WFInput=attachment(shortcut_input), WFJavaScript=SAFARI_SCRIPT),
        condition(g_safari, 1),
        action("gettext", WFTextActionText=""),
        condition(g_safari, 2, ids["ifsafari"]),
        action("downloadurl", ids["lists"], WFURL=api, WFHTTPMethod="GET", ShowHeaders=True, WFHTTPHeaders=auth),
        action("getvalueforkey", ids["listnames"], WFInput=attachment(output(ids["lists"], "Contents of URL")),
               WFGetDictionaryValueType="Value", WFDictionaryKey="lists"),
        action("count", ids["count"], WFCountType="Items", Input=attachment(output(ids["listnames"], "Dictionary Value"))),
        condition(g_many, 0, WFCondition=2, WFNumberValue="1",
                  WFInput={"Type": "Variable", "Variable": attachment(output(ids["count"], "Count"))}),
        action("choosefromlist", ids["choose"], WFInput=attachment(output(ids["listnames"], "Dictionary Value")),
               WFChooseFromListActionPrompt=say["whose_list"]),
        condition(g_many, 1),
        action("getitemfromlist", ids["first"], WFInput=attachment(output(ids["listnames"], "Dictionary Value")),
               WFItemSpecifier="First Item"),
        condition(g_many, 2, ids["ifmany"]),
        action("downloadurl", ids["post"], WFURL=api, WFHTTPMethod="POST", ShowHeaders=True, WFHTTPHeaders=auth,
               WFHTTPBodyType="JSON", WFJSONValues=fields([
                   ("url", text(OBJ, output(ids["link"], "URLs"))),
                   ("til", text(OBJ, output(ids["ifmany"], "If Result"))),
                   ("html", text(OBJ, output(ids["ifsafari"], "If Result"))),
               ])),
        action("getvalueforkey", ids["message"], WFInput=attachment(output(ids["post"], "Contents of URL")),
               WFGetDictionaryValueType="Value", WFDictionaryKey="message"),
        action("notification", WFNotificationActionTitle=say["name"],
               WFNotificationActionBody=text(OBJ, output(ids["message"], "Dictionary Value")),
               WFNotificationActionSound=False),
    ]

    return {
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowClientVersion": "2302.0.4",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": 4282601983, "WFWorkflowIconGlyphNumber": 59511},
        "WFWorkflowTypes": ["ActionExtension"],
        "WFWorkflowInputContentItemClasses": ["WFSafariWebPageContentItem", "WFURLContentItem"],
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowHasShortcutInputVariables": True,
        "WFWorkflowImportQuestions": [{
            "ActionIndex": 0,
            "Category": "Parameter",
            "ParameterKey": "WFTextActionText",
            "Text": say["key_question"],
            "DefaultValue": "",
        }],
        "WFWorkflowActions": actions,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lang", choices=sorted(TEXTS), default="en")
    parser.add_argument("origin")
    parser.add_argument("output")
    args = parser.parse_args()
    with open(args.output, "wb") as f:
        plistlib.dump(build(args.origin.rstrip("/"), args.lang), f, fmt=plistlib.FMT_BINARY)
