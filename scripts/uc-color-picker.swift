// Tiny macOS helper that invokes the system color sampler (the Digital
// Color Meter–style loupe that follows the cursor, works across Spaces and
// across all displays, and needs no Screen Recording permission because the
// pixel read happens in the OS).
//
// Output on stdout when the user picks a color:  "<r>,<g>,<b>\n"
// Exit code 0 = picked, 1 = cancelled / no color.
//
// Build (universal binary):
//   swiftc -target arm64-apple-macos11.0 -o /tmp/p-arm64 uc-color-picker.swift
//   swiftc -target x86_64-apple-macos11.0 -o /tmp/p-x64  uc-color-picker.swift
//   lipo -create /tmp/p-arm64 /tmp/p-x64 -output uc-color-picker
import AppKit

class Delegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ note: Notification) {
        NSColorSampler().show { color in
            guard let c = color?.usingColorSpace(.sRGB) else {
                NSApp.terminate(nil); return
            }
            let r = Int((c.redComponent * 255).rounded())
            let g = Int((c.greenComponent * 255).rounded())
            let b = Int((c.blueComponent * 255).rounded())
            print("\(r),\(g),\(b)")
            fflush(stdout)
            NSApp.terminate(nil)
        }
    }

    func applicationWillTerminate(_ note: Notification) {}
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = Delegate()
app.delegate = delegate
app.run()
