# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a Vulnerability

**DO NOT** report security vulnerabilities as public GitHub issues.

Instead, please report them responsibly:

1. **Email**: Send details to `juan@chamosbarber.com`
2. **Subject Line**: `[SECURITY] Vulnerability Report - Chamos Barber`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix Timeline**: Depends on severity (Critical: 7 days, High: 14 days, Medium: 30 days)

## Security Best Practices

- Never commit `.env` files or credentials
- All production secrets are managed via Coolify environment variables
- Database access is restricted via Row Level Security (RLS)
- Authentication tokens expire after 24 hours

---
*Security is a top priority for Chamos Barber. Thank you for helping keep our users safe.*
