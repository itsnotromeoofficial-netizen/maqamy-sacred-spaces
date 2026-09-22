REVOKE ALL ON FUNCTION public.handle_new_customer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_customer() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_customer() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_customer() TO service_role;