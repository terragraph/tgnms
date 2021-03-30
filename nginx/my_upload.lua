-- Copyright (c) 2014-present, Facebook, Inc.
local upload = require "resty.upload"

local function get_filename(header)
    local filename
    for _, elem in ipairs(header) do
        filename = string.match(elem, 'filename="(.*)"')
        if filename and filename ~= '' then
            return filename
        end
    end
    return nil
end

local function exit_error(err, code)
    ngx.status = code
    ngx.say(err)
    ngx.exit(code)
end

local chunk_size = 4096
local form, err = upload:new(chunk_size)
if not form then
    exit_error("Failed to upload: " .. err, 500)
end

local file, path
while true do
    local type, res, err = form:read()
    if not type then
        exit_error("Failed to read file: " .. err, 500)
    elseif type == "header" then
        local filename = get_filename(res)
        if filename then
            path = ngx.var.dirname .. filename
            file, err = io.open(path, "w+")
            if not file then
                exit_error("Failed to open file: " .. err, 500)
            end
        end
    elseif type == "body" then
        if file then
            file:write(res)
        end
    elseif type == "part_end" then
        if file then
            file:close()
            file = nil
            ngx.say("Successfully uploaded to ", path)
        end
    elseif type == "eof" then
        break
    end
end
