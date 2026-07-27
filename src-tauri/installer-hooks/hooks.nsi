!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Removendo credenciais do Corebit Agent..."
  nsExec::Exec '"$INSTDIR\Corebit Agent.exe" --purge-credentials'
  Pop $0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  RMDir /r "$LOCALAPPDATA\com.corebit.agent"
!macroend

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend
