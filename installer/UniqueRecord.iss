#define MyAppName "UniqueRecord"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "UniqueRecord"
#define MyAppExeName "UniqueRecord.exe"
#define BuildStamp GetDateTimeString('yyyymmdd_hhnnss', '', '')

[Setup]
AppId={{A8DC8E70-8A2B-4E18-9FF1-9B93AA9EA21B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\dist_installer
OutputBaseFilename=UniqueRecord_Setup_{#MyAppVersion}_{#BuildStamp}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
SetupIconFile=..\assets\branding\unique_record_logo_i.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
DisableDirPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
english.FolderPickerHint=Click Folder... to open Windows directory picker.
chinesesimplified.FolderPickerHint=Click Folder... to open Windows directory picker.
english.FolderPickerDialogTitle=Select installation folder
chinesesimplified.FolderPickerDialogTitle=Select installation folder
english.FolderPickerButtonCaption=Folder...
chinesesimplified.FolderPickerButtonCaption=Folder...

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\UniqueRecord\*"; DestDir: "{app}"; Excludes: "recordings\*"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
