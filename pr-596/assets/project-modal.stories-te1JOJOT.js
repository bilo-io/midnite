import{a_ as n,aw as R}from"./iframe-Dbv8GeUC.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-C4eCkV74.js";import{P as H}from"./project-modal-Cjah15zA.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DUQOmHN-.js";import"./Select-ef7c0426.esm-BtLyMKAa.js";import"./chevron-down-BojTJ9dd.js";import"./check-C676Z6fj.js";import"./export-menu-BhyS1Mmc.js";import"./client-aQCNNeW0.js";import"./markdown-preview-MN59M1-R.js";import"./index.dom-D_wTd2ti.js";import"./file-text-UOhROh6P.js";import"./copy-4hDKluiY.js";import"./file-code-corner-BKEXtMZO.js";import"./loader-circle-P1Z8Xk-a.js";import"./api-CYrdW_Uy.js";import"./folder-open-DndOy5Hq.js";import"./folder-rh_DVxLj.js";import"./tag-color-picker-EJRb4Ma9.js";import"./project-tag-ueLXHLrb.js";import"./sparkles-1QoBmck6.js";import"./brain-CEJJO2jL.js";import"./chevron-right-CZIU9qWD.js";import"./markdown-editor-DKoAMeP5.js";import"./pencil-BGSNorbY.js";import"./trash-2-68qyk1vq.js";import"./templates-BzAEHnXs.js";import"./plus-DG5lmwzv.js";import"./task-row-X0PrcrDa.js";import"./blocked-badge-DhqpgW1E.js";import"./selectable-icon-DIZHIik6.js";import"./hover-expand-button-BuLyxOy8.js";import"./index-BaFJ7AjI.js";import"./data-refresh-zQX687gF.js";import"./rotate-ccw-wQfAvU_V.js";import"./play-8xIQeECd.js";import"./square-terminal-oYB9e4Pm.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DcFoJ-UT.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ja as __namedExportsOrder,ba as default};
