-- Add description field to scenes table
ALTER TABLE scenes ADD COLUMN description TEXT;

-- Add description field to clips table
ALTER TABLE clips ADD COLUMN description TEXT;
