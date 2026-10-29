// Minimal `gcc` shim used only for `windres` preprocessing in this sandbox.
//
// windres invokes `gcc -E ...` before compiling a .rc file. The portable
// toolchain has no GCC, and the generated resource file contains a mangled
// non-ASCII icon path. This shim passes the resource through unchanged except
// for replacing the icon line with an ASCII path that windres can open.
use std::env;
use std::fs;
use std::io::{self, Read, Write};
use std::path::PathBuf;

const ICON_LINE_PREFIX: &str = "32512 ICON";

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let mut output: Option<PathBuf> = None;
    let mut input: Option<PathBuf> = None;

    let mut index = 0;
    while index < args.len() {
        let arg = &args[index];
        if arg == "-o" && index + 1 < args.len() {
            output = Some(PathBuf::from(&args[index + 1]));
            index += 2;
            continue;
        }
        if let Some(path) = arg.strip_prefix("-o") {
            if !path.is_empty() {
                output = Some(PathBuf::from(path));
                index += 1;
                continue;
            }
        }
        if !arg.starts_with('-') {
            input = Some(PathBuf::from(arg));
        }
        index += 1;
    }

    let mut bytes = Vec::new();
    match &input {
        Some(path) => {
            if let Ok(data) = fs::read(path) {
                bytes = data;
            }
        }
        None => {
            let _ = io::stdin().read_to_end(&mut bytes);
        }
    }

    let text = String::from_utf8_lossy(&bytes);
    let icon_path = icon_path();
    let mut rewritten = String::new();
    for line in text.lines() {
        if line.trim_start().starts_with(ICON_LINE_PREFIX) {
            if let Some(path) = &icon_path {
                rewritten.push_str(&format!("{} \"{}\"\n", ICON_LINE_PREFIX, path));
                continue;
            }
        }
        rewritten.push_str(line);
        rewritten.push('\n');
    }

    match output {
        Some(path) => {
            if let Err(error) = fs::write(&path, rewritten.as_bytes()) {
                eprintln!("gcc shim: cannot write {}: {error}", path.display());
                std::process::exit(1);
            }
        }
        None => {
            let mut stdout = io::stdout();
            let _ = stdout.write_all(rewritten.as_bytes());
        }
    }
}

fn icon_path() -> Option<String> {
    for name in ["QINGSHAN_ICON_PATH", "OPSDECK_ICON_PATH"] {
        if let Ok(value) = env::var(name) {
            if !value.is_empty() {
                return Some(value.replace('\\', "\\\\"));
            }
        }
    }
    for candidate in [
        r"R:\desktop\src-tauri\icons\icon.ico",
        r"R:\target\icon.ico",
    ] {
        if std::path::Path::new(candidate).exists() {
            return Some(candidate.replace('\\', "\\\\"));
        }
    }
    None
}
