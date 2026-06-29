alter table public.return_requests
  add constraint return_requests_borrow_record_id_fkey
  foreign key (borrow_record_id) references public.borrow_records(id);

alter table public.return_request_details
  add constraint return_request_details_borrow_detail_id_fkey
  foreign key (borrow_detail_id) references public.borrow_details(id);

alter table public.renewal_requests
  add constraint renewal_requests_borrow_record_id_fkey
  foreign key (borrow_record_id) references public.borrow_records(id);

alter table public.renewal_requests
  add constraint renewal_requests_borrow_detail_id_fkey
  foreign key (borrow_detail_id) references public.borrow_details(id);
