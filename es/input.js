const modifier = (text) => LW.safe("input", text, () => LW.onInput(text));
modifier(text)