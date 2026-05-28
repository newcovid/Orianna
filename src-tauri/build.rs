// src-tauri/build.rs

fn main() {
    // 检查当前是否在 Windows 环境下编译
    #[cfg(windows)]
    {
        let mut windows = tauri_build::WindowsAttributes::new();

        // 注入 Windows Manifest 清单文件
        // 核心在于 <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
        // 这行代码会强制 .exe 在双击时自动触发 UAC 提权弹窗
        windows = windows.app_manifest(
            r#"
            <assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
              <dependency>
                <dependentAssembly>
                  <assemblyIdentity type="win32" name="Microsoft.Windows.Common-Controls" version="6.0.0.0" processorArchitecture="*" publicKeyToken="6595b64144ccf1df" language="*" />
                </dependentAssembly>
              </dependency>
              <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
                <security>
                  <requestedPrivileges>
                    <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
                  </requestedPrivileges>
                </security>
              </trustInfo>
            </assembly>
            "#
        );

        tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
            .expect("failed to run tauri-build");
    }

    #[cfg(not(windows))]
    {
        tauri_build::build();
    }
}
