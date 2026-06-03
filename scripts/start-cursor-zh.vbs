Option Explicit

Dim shell
Dim fso
Dim scriptDir
Dim workspaceRoot
Dim launcherConfigPath
Dim cursorExePath
Dim command
Dim i

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
workspaceRoot = fso.GetParentFolderName(scriptDir)
launcherConfigPath = fso.BuildPath(workspaceRoot, "state\start-cursor-path.txt")
cursorExePath = ReadFirstLine(launcherConfigPath)

If cursorExePath <> "" And fso.FileExists(cursorExePath) Then
  command = QuoteArgument(cursorExePath)
Else
  command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & QuoteArgument(fso.BuildPath(scriptDir, "invoke-cursor-zh.ps1")) & " start"
End If

For i = 0 To WScript.Arguments.Count - 1
  command = command & " " & QuoteArgument(CStr(WScript.Arguments.Item(i)))
Next

shell.Run command, 0, False

Function QuoteArgument(value)
  QuoteArgument = """" & Replace(value, """", """""") & """"
End Function

Function ReadFirstLine(filePath)
  Dim stream
  Dim line

  ReadFirstLine = ""
  If filePath = "" Then Exit Function
  If Not fso.FileExists(filePath) Then Exit Function

  Set stream = fso.OpenTextFile(filePath, 1, False)
  If Not stream.AtEndOfStream Then
    line = Trim(stream.ReadLine)
    If line <> "" Then
      ReadFirstLine = line
    End If
  End If
  stream.Close
End Function
