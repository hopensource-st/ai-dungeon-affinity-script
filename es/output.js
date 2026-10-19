const modifier = (text) => LW.safe("output", text, () => LW.onOutput(text));
modifier(text)