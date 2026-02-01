import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "visitor-photos";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const uploadsDir = path.join(process.cwd(), "server/uploads");

async function migrateToSupabase() {
    if (!fs.existsSync(uploadsDir)) {
        console.log("No uploads directory found. Skipping...");
        return;
    }

    const files = fs.readdirSync(uploadsDir);
    console.log(`Found ${files.length} files to migrate to Supabase Storage.`);

    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        const fileBuffer = fs.readFileSync(filePath);
        const storagePath = `uploads/${file}`;

        console.log(`Uploading: ${file}...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileBuffer, {
                upsert: true,
                contentType: "image/jpeg",
            });

        if (uploadError) {
            console.error(`Error uploading ${file}:`, uploadError.message);
            continue;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        console.log(`Successfully uploaded: ${file}. Updating database record...`);

        // Update database record
        // We assume the photo_path in current DB is something like '/uploads/filename.jpg'
        const legacyPath = `/uploads/${file}`;
        const { error: dbError } = await supabase
            .from('visitors')
            .update({ photo_path: publicUrl })
            .eq('photo_path', legacyPath);

        if (dbError) {
            console.error(`Error updating DB for ${file}:`, dbError.message);
        } else {
            console.log(`Database updated for: ${file}`);
        }
    }

    console.log("Supabase storage migration and database synchronization completed.");
}

migrateToSupabase();
