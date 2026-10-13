import AppKit

func crop(imagePath: String, x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, outPath: String) {
    guard let image = NSImage(contentsOfFile: imagePath) else {
        print("Failed to load \(imagePath)")
        return
    }
    guard let rep = image.representations.first as? NSBitmapImageRep else {
        print("No rep")
        return
    }
    guard let cgImage = rep.cgImage else {
        print("No cgImage")
        return
    }
    let cropRect = CGRect(x: x, y: y, width: width, height: height)
    guard let cropped = cgImage.cropping(to: cropRect) else {
        print("Crop failed")
        return
    }
    let newRep = NSBitmapImageRep(cgImage: cropped)
    guard let pngData = newRep.representation(using: .png, properties: [:]) else {
        print("PNG failed")
        return
    }
    try? pngData.write(to: URL(fileURLWithPath: outPath))
    print("Saved \(outPath) (\(Int(width))x\(Int(height)))")
}

let src = "/Users/ankithravindran/.gemini/antigravity-ide/brain/75e90185-6c08-497f-8e9a-79d3bc8bc604/.user_uploaded/media_1791932931026.png"

// 1. Action buttons in top header (just the two buttons: Run Complete Intel + Decision Makers)
crop(imagePath: src, x: 610, y: 22, width: 310, height: 86, outPath: "docs/images/action_buttons.png")

// 2. Full Hub Header (Title, badges, and both action buttons)
crop(imagePath: src, x: 35, y: 18, width: 890, height: 95, outPath: "docs/images/hub_header_new.png")

// 3. Decision Maker card (showing Kerrie Nelson, Primary Decision Maker, LinkedIn button, and fixed [+ Add to Contacts] button)
crop(imagePath: src, x: 45, y: 182, width: 934, height: 68, outPath: "docs/images/decision_maker_card_new.png")


// 4. Dual comparison card (AI Website Scrape vs Agent Reach Live Signals)
crop(imagePath: src, x: 45, y: 265, width: 934, height: 250, outPath: "docs/images/dual_intel_signals.png")

// 5. Executive summary and suggested opener cards
crop(imagePath: src, x: 45, y: 530, width: 934, height: 440, outPath: "docs/images/executive_summary_and_opener.png")


let srcScrape = "/Users/ankithravindran/.gemini/antigravity-ide/brain/75e90185-6c08-497f-8e9a-79d3bc8bc604/.user_uploaded/media_1791932940133.png"

// 6. Branch Footprint & Store Locations Grid
crop(imagePath: srcScrape, x: 40, y: 460, width: 920, height: 450, outPath: "docs/images/branch_footprint_locations.png")

// 7. Industry Classification & AP Relationship Signals
crop(imagePath: srcScrape, x: 40, y: 170, width: 920, height: 280, outPath: "docs/images/industry_and_ap_signals.png")

