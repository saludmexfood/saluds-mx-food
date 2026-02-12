# DEMO_MODE

Setting `DEMO_MODE=true` enables the application’s demo behavior, ensuring that all interactions are simulated and no real data or transactions occur.

Key behaviors in demo mode:
- Test payments only via sandbox payment gateways. No real transactions will be processed.  
- Messaging (emails, SMS) is routed through sandbox providers.  
- Access is restricted to whitelisted [PLACEHOLDER] accounts or domains.  
- All business content (addresses, phone numbers, menu items, prices, policies) remains placeholders (Lorem Ipsum / `[PLACEHOLDER]`).  
- Demo data is periodically reset to its initial state.