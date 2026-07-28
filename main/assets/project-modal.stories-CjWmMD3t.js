import{aX as n,ay as R}from"./iframe-BW8LrSff.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-J_66Omso.js";import{P as H}from"./project-modal-DcSqwvyI.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CDPPe3zG.js";import"./Select-ef7c0426.esm-CwuYPJMO.js";import"./chevron-down-CUuC70qD.js";import"./check-Lr-Y75om.js";import"./index-BIZ5y_fy.js";import"./triangle-alert-B0sJ6XEY.js";import"./export-menu-D2h8TxvY.js";import"./client-BNSZwCLK.js";import"./markdown-preview-BnmQv0p3.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BzKGNEb-.js";import"./copy-9phrF4xD.js";import"./file-code-corner-sWqDKwH7.js";import"./loader-circle-DUzavR-B.js";import"./api-D1N2ZThP.js";import"./folder-open-BSGmf3do.js";import"./folder-B9uAHYyh.js";import"./tag-color-picker-9Qbw17hq.js";import"./project-tag-BkLPn1jq.js";import"./sparkles-BApNO255.js";import"./brain-BhKoiUoX.js";import"./chevron-right-2HpEbpg4.js";import"./markdown-editor-B-Js-h_x.js";import"./pencil-jWIPm1Cx.js";import"./trash-2-D23f5QRJ.js";import"./templates-DAU6TT81.js";import"./plus-NmQKi_hk.js";import"./task-row-DzLHhfFI.js";import"./i18n-labels-D-MaNUEh.js";import"./selectable-icon-BO0uditV.js";import"./hover-expand-button-CA4V5KvY.js";import"./index-Dwi3twcK.js";import"./data-refresh-DVmExEha.js";import"./rotate-ccw-YUwZjYCS.js";import"./play-BNpObWEz.js";import"./square-terminal-CcDz7hbi.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
