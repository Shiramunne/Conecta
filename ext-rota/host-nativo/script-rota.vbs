Option Explicit
Dim args, raw, cmdType, ipDestino, shell, gateway
Set args = WScript.Arguments
If args.Count = 0 Then WScript.Quit
raw = Trim(args(0))

' Detecção simples
If InStr(raw, "rota://") = 1 Then
    cmdType = "rota"
    ipDestino = Mid(raw, 8)
Else
    cmdType = "ping"
    If InStr(raw, "ping://") = 1 Then ipDestino = Mid(raw, 8) Else ipDestino = raw
End If

' Sanitização básica
ipDestino = Split(Split(ipDestino, "/")(0), "?")(0)

' Elevação para Rota
If cmdType = "rota" Then
    If Not WScript.Arguments.Named.Exists("elevated") Then
        CreateObject("Shell.Application").ShellExecute "wscript.exe", """" & WScript.ScriptFullName & """ """ & raw & """ /elevated", "", "runas", 1
        WScript.Quit
    End If
End If

Set shell = CreateObject("WScript.Shell")
gateway = "10.15.1.70"

If cmdType = "rota" Then
    shell.Run "cmd /c route ADD " & ipDestino & " MASK 255.255.255.255 " & gateway, 0, True
Else
    On Error Resume Next
    shell.Run "wt.exe --title ""Ping " & ipDestino & """ powershell -NoExit -Command ""ping -t " & ipDestino & """", 1, False
    If Err.Number <> 0 Then shell.Run "cmd /c start ""Ping " & ipDestino & """ ping -t " & ipDestino, 1, False
End If