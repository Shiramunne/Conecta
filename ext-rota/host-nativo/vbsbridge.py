import sys, json, struct, subprocess, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VBS_SCRIPT = os.path.join(SCRIPT_DIR, "script-rota.vbs")

def main():
    try:
        raw_len = sys.stdin.buffer.read(4)
        if not raw_len: return
        msg_len = struct.unpack('I', raw_len)[0]
        msg = sys.stdin.buffer.read(msg_len).decode('utf-8')
        data = json.loads(msg)
        texto = data.get("texto", "").strip()
        
        if texto:
            # Chama VBS e solta o processo (não bloqueia o Chrome)
            subprocess.Popen(["wscript", VBS_SCRIPT, texto], shell=False, close_fds=True)
    except: pass

if __name__ == "__main__":
    main()